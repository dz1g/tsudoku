import test from 'node:test';
import assert from 'node:assert';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as ClientIO } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents, Room, Player } from '@tsudoku/shared';
import { RoomManager } from './room.js';
import { setupSocketHandlers } from './socket.js';

test('End-to-End Socket Multiplayer Flow', async (t) => {
  const httpServer = createServer();
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer);
  const roomManager = new RoomManager();
  setupSocketHandlers(io, roomManager);

  await new Promise<void>((resolve) => httpServer.listen(0, () => resolve()));
  const port = (httpServer.address() as any).port;
  const url = `http://localhost:${port}`;

  const client1 = ClientIO(url, { transports: ['websocket'] });
  const client2 = ClientIO(url, { transports: ['websocket'] });

  await Promise.all([
    new Promise<void>((resolve) => { client1.on('connect', () => resolve()); }),
    new Promise<void>((resolve) => { client2.on('connect', () => resolve()); }),
  ]);

  let roomCode = '';
  let hostPlayerId = '';

  // 1. Host creates room
  await t.test('Client 1 creates room', async () => {
    await new Promise<void>((resolve) => {
      client1.emit('room:create', { name: 'PlayerOne', settings: { difficulty: 'easy', validationMode: 'instant' } }, (res: any) => {
        assert.strictEqual(res.success, true);
        assert.ok(res.room);
        roomCode = res.room.code;
        hostPlayerId = res.room.hostId;
        assert.strictEqual(res.room.players[hostPlayerId].name, 'PlayerOne');
        resolve();
      });
    });
  });

  // 2. Client 2 joins room
  await t.test('Client 2 joins room with room code', async () => {
    await new Promise<void>((resolve) => {
      client2.emit('room:join', { code: roomCode, name: 'PlayerTwo' }, (res: any) => {
        assert.strictEqual(res.success, true);
        assert.ok(res.room);
        const players: Player[] = Object.values(res.room.players);
        assert.strictEqual(players.length, 2);
        const p2 = players.find(p => p.name === 'PlayerTwo');
        assert.ok(p2);
        resolve();
      });
    });
  });

  // 3. Host starts game
  let startedRoom: Room | null = null;
  await t.test('Host starts game and clients receive started event', async () => {
    const startedPromise = new Promise<void>((resolve) => {
      client2.on('room:started', ({ room }: { room: Room }) => {
        assert.strictEqual(room.status, 'PLAYING');
        assert.ok(room.puzzle);
        assert.ok(room.puzzle.initial);
        assert.ok(room.puzzle.solution);
        startedRoom = room;
        resolve();
      });
    });

    client1.emit('room:start');
    await startedPromise;
  });

  // 4. Test Cell update scoring & penalty
  await t.test('Client 1 places correct cell and incorrect cell', async () => {
    assert.ok(startedRoom);
    const puzzle = (startedRoom as Room).puzzle!;
    
    // Find empty cell
    let targetR = -1, targetC = -1;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (puzzle.initial[r][c] === 0) {
          targetR = r;
          targetC = c;
          break;
        }
      }
      if (targetR !== -1) break;
    }

    const correctVal = puzzle.solution[targetR][targetC];

    let initialScore = 0;
    // Test correct move
    const correctPromise = new Promise<void>((resolve) => {
      client1.once('game:cell_result', (result: any) => {
        assert.strictEqual(result.isValid, true);
        assert.ok(result.deltaScore > 0);
        assert.strictEqual(result.isLocked, true);
        initialScore = result.currentScore;
        resolve();
      });
    });
    client1.emit('game:cell_update', { row: targetR, col: targetC, value: correctVal, timeSpentMs: 1500 });
    await correctPromise;

    // Test anti-abuse: sending the same cell again must grant 0 points
    const abusePromise = new Promise<void>((resolve) => {
      client1.once('game:cell_result', (result: any) => {
        assert.strictEqual(result.isValid, true);
        assert.strictEqual(result.deltaScore, 0);
        assert.strictEqual(result.currentScore, initialScore);
        assert.strictEqual(result.isLocked, true);
        resolve();
      });
    });
    client1.emit('game:cell_update', { row: targetR, col: targetC, value: correctVal, timeSpentMs: 1000 });
    await abusePromise;

    // Find a second empty cell for testing incorrect placement
    let targetR2 = -1, targetC2 = -1;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (puzzle.initial[r][c] === 0 && !(r === targetR && c === targetC)) {
          targetR2 = r;
          targetC2 = c;
          break;
        }
      }
      if (targetR2 !== -1) break;
    }
    const wrongVal = puzzle.solution[targetR2][targetC2] === 9 ? 1 : puzzle.solution[targetR2][targetC2] + 1;

    // Test wrong move on second empty cell
    const wrongPromise = new Promise<void>((resolve) => {
      client1.once('game:cell_result', (result: any) => {
        assert.strictEqual(result.isValid, false);
        assert.strictEqual(result.deltaScore, -50);
        resolve();
      });
    });
    client1.emit('game:cell_update', { row: targetR2, col: targetC2, value: wrongVal, timeSpentMs: 1000 });
    await wrongPromise;
  });

  // Cleanup
  client1.disconnect();
  client2.disconnect();
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});
