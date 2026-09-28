"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUnreadTotal = exports.listSessions = exports.getMessagesBySessionId = exports.addMessage = exports.updateSession = exports.getSessionById = exports.createSession = exports.initDb = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
const config_1 = __importDefault(require("../config"));
let pool = null;
const initDb = async () => {
    if (pool)
        return pool;
    const connection = await promise_1.default.createConnection({
        host: config_1.default.db.host,
        port: config_1.default.db.port,
        user: config_1.default.db.user,
        password: config_1.default.db.password
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config_1.default.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.end();
    pool = promise_1.default.createPool({
        host: config_1.default.db.host,
        port: config_1.default.db.port,
        user: config_1.default.db.user,
        password: config_1.default.db.password,
        database: config_1.default.db.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
    await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id VARCHAR(64) PRIMARY KEY,
      userId VARCHAR(64) DEFAULT NULL,
      customerName VARCHAR(255) NOT NULL DEFAULT 'Khách hàng',
      customerEmail VARCHAR(255) DEFAULT '',
      status VARCHAR(32) DEFAULT 'ai',
      lastMessage TEXT,
      unreadByAdmin INT DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
    await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id VARCHAR(64) PRIMARY KEY,
      sessionId VARCHAR(64) NOT NULL,
      sender VARCHAR(32) NOT NULL,
      senderName VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      suggestedProducts JSON DEFAULT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sessionId) REFERENCES chat_sessions(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
    return pool;
};
exports.initDb = initDb;
const createSession = async ({ userId = null, customerName = 'Khách hàng', customerEmail = '' } = {}) => {
    const db = await (0, exports.initDb)();
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await db.query(`INSERT INTO chat_sessions (id, userId, customerName, customerEmail, status, lastMessage, unreadByAdmin, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, 'ai', ?, 0, NOW(), NOW())`, [sessionId, userId, customerName, customerEmail, 'Chào mừng bạn đến với NovaShop! Tôi có thể giúp gì cho bạn hôm nay?']);
    const initialMsgId = `msg_${Date.now()}_1`;
    const initialText = `Xin chào ${customerName || 'bạn'}! 👋 Tôi là NovaBot - Trợ lý AI của NovaShop.\nTôi có thể giúp bạn tìm kiếm sản phẩm, gợi ý ưu đãi, giải đáp bảo hành hoặc kiểm tra đơn hàng. Bạn cần tìm gì hôm nay?`;
    await db.query(`INSERT INTO chat_messages (id, sessionId, sender, senderName, message, createdAt)
     VALUES (?, ?, 'ai', 'NovaBot AI', ?, NOW())`, [initialMsgId, sessionId, initialText]);
    return (0, exports.getSessionById)(sessionId);
};
exports.createSession = createSession;
const getSessionById = async (sessionId) => {
    const db = await (0, exports.initDb)();
    const [rows] = await db.query('SELECT * FROM chat_sessions WHERE id = ? LIMIT 1', [sessionId]);
    return rows.length > 0 ? rows[0] : null;
};
exports.getSessionById = getSessionById;
const updateSession = async (sessionId, { status, customerName, customerEmail, lastMessage, incrementUnread = false, resetUnread = false }) => {
    const db = await (0, exports.initDb)();
    const updates = [];
    const params = [];
    if (status !== undefined) {
        updates.push('status = ?');
        params.push(status);
    }
    if (customerName !== undefined) {
        updates.push('customerName = ?');
        params.push(customerName);
    }
    if (customerEmail !== undefined) {
        updates.push('customerEmail = ?');
        params.push(customerEmail);
    }
    if (lastMessage !== undefined) {
        updates.push('lastMessage = ?');
        params.push(lastMessage);
    }
    if (resetUnread) {
        updates.push('unreadByAdmin = 0');
    }
    else if (incrementUnread) {
        updates.push('unreadByAdmin = unreadByAdmin + 1');
    }
    if (updates.length === 0)
        return (0, exports.getSessionById)(sessionId);
    params.push(sessionId);
    await db.query(`UPDATE chat_sessions SET ${updates.join(', ')}, updatedAt = NOW() WHERE id = ?`, params);
    return (0, exports.getSessionById)(sessionId);
};
exports.updateSession = updateSession;
const addMessage = async ({ sessionId, sender, senderName, message, suggestedProducts = null }) => {
    const db = await (0, exports.initDb)();
    const id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const jsonProducts = suggestedProducts ? JSON.stringify(suggestedProducts) : null;
    await db.query(`INSERT INTO chat_messages (id, sessionId, sender, senderName, message, suggestedProducts, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`, [id, sessionId, sender, senderName, message, jsonProducts]);
    const incrementUnread = sender === 'customer';
    await (0, exports.updateSession)(sessionId, {
        lastMessage: message,
        incrementUnread
    });
    return {
        id,
        sessionId,
        sender,
        senderName,
        message,
        suggestedProducts,
        createdAt: new Date().toISOString()
    };
};
exports.addMessage = addMessage;
const getMessagesBySessionId = async (sessionId) => {
    const db = await (0, exports.initDb)();
    const [rows] = await db.query('SELECT * FROM chat_messages WHERE sessionId = ? ORDER BY createdAt ASC', [sessionId]);
    return rows.map((r) => {
        let suggestedProducts = null;
        if (r.suggestedProducts) {
            try {
                suggestedProducts = typeof r.suggestedProducts === 'string' ? JSON.parse(r.suggestedProducts) : r.suggestedProducts;
            }
            catch (e) {
                suggestedProducts = null;
            }
        }
        return {
            ...r,
            suggestedProducts
        };
    });
};
exports.getMessagesBySessionId = getMessagesBySessionId;
const listSessions = async ({ status } = {}) => {
    const db = await (0, exports.initDb)();
    let query = 'SELECT * FROM chat_sessions WHERE 1=1';
    const params = [];
    if (status && status !== 'all') {
        query += ' AND status = ?';
        params.push(status);
    }
    query += ' ORDER BY updatedAt DESC LIMIT 50';
    const [rows] = await db.query(query, params);
    return rows;
};
exports.listSessions = listSessions;
const getUnreadTotal = async () => {
    const db = await (0, exports.initDb)();
    const [rows] = await db.query('SELECT SUM(unreadByAdmin) as totalUnread FROM chat_sessions');
    return Number(rows[0]?.totalUnread || 0);
};
exports.getUnreadTotal = getUnreadTotal;
exports.default = {
    initDb: exports.initDb,
    createSession: exports.createSession,
    getSessionById: exports.getSessionById,
    updateSession: exports.updateSession,
    addMessage: exports.addMessage,
    getMessagesBySessionId: exports.getMessagesBySessionId,
    listSessions: exports.listSessions,
    getUnreadTotal: exports.getUnreadTotal
};
