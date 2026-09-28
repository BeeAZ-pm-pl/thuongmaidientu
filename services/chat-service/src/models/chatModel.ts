import mysql from 'mysql2/promise';
import config from '../config';

export interface ChatSession {
  id: string;
  userId?: string | null;
  customerName: string;
  customerEmail?: string;
  status: string;
  lastMessage?: string;
  unreadByAdmin?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  sender: 'customer' | 'ai' | 'staff';
  senderName: string;
  message: string;
  suggestedProducts?: any;
  createdAt?: string;
}

let pool: mysql.Pool | null = null;

export const initDb = async (): Promise<mysql.Pool> => {
  if (pool) return pool;

  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.end();

  pool = mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
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

export const createSession = async ({
  userId = null,
  customerName = 'Khách hàng',
  customerEmail = ''
}: {
  userId?: string | null;
  customerName?: string;
  customerEmail?: string;
} = {}): Promise<ChatSession | null> => {
  const db = await initDb();
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  
  await db.query(
    `INSERT INTO chat_sessions (id, userId, customerName, customerEmail, status, lastMessage, unreadByAdmin, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, 'ai', ?, 0, NOW(), NOW())`,
    [sessionId, userId, customerName, customerEmail, 'Chào mừng bạn đến với NovaShop! Tôi có thể giúp gì cho bạn hôm nay?']
  );

  const initialMsgId = `msg_${Date.now()}_1`;
  const initialText = `Xin chào ${customerName || 'bạn'}! 👋 Tôi là NovaBot - Trợ lý AI của NovaShop.\nTôi có thể giúp bạn tìm kiếm sản phẩm, gợi ý ưu đãi, giải đáp bảo hành hoặc kiểm tra đơn hàng. Bạn cần tìm gì hôm nay?`;

  await db.query(
    `INSERT INTO chat_messages (id, sessionId, sender, senderName, message, createdAt)
     VALUES (?, ?, 'ai', 'NovaBot AI', ?, NOW())`,
    [initialMsgId, sessionId, initialText]
  );

  return getSessionById(sessionId);
};

export const getSessionById = async (sessionId: string): Promise<ChatSession | null> => {
  const db = await initDb();
  const [rows]: any = await db.query('SELECT * FROM chat_sessions WHERE id = ? LIMIT 1', [sessionId]);
  return rows.length > 0 ? (rows[0] as ChatSession) : null;
};

export const updateSession = async (
  sessionId: string,
  {
    status,
    customerName,
    customerEmail,
    lastMessage,
    incrementUnread = false,
    resetUnread = false
  }: {
    status?: string;
    customerName?: string;
    customerEmail?: string;
    lastMessage?: string;
    incrementUnread?: boolean;
    resetUnread?: boolean;
  }
): Promise<ChatSession | null> => {
  const db = await initDb();
  const updates: string[] = [];
  const params: any[] = [];

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
  } else if (incrementUnread) {
    updates.push('unreadByAdmin = unreadByAdmin + 1');
  }

  if (updates.length === 0) return getSessionById(sessionId);

  params.push(sessionId);
  await db.query(`UPDATE chat_sessions SET ${updates.join(', ')}, updatedAt = NOW() WHERE id = ?`, params);
  return getSessionById(sessionId);
};

export const addMessage = async ({
  sessionId,
  sender,
  senderName,
  message,
  suggestedProducts = null
}: {
  sessionId: string;
  sender: 'customer' | 'ai' | 'staff';
  senderName: string;
  message: string;
  suggestedProducts?: any;
}): Promise<ChatMessage> => {
  const db = await initDb();
  const id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const jsonProducts = suggestedProducts ? JSON.stringify(suggestedProducts) : null;

  await db.query(
    `INSERT INTO chat_messages (id, sessionId, sender, senderName, message, suggestedProducts, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [id, sessionId, sender, senderName, message, jsonProducts]
  );

  const incrementUnread = sender === 'customer';
  await updateSession(sessionId, {
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

export const getMessagesBySessionId = async (sessionId: string): Promise<ChatMessage[]> => {
  const db = await initDb();
  const [rows]: any = await db.query(
    'SELECT * FROM chat_messages WHERE sessionId = ? ORDER BY createdAt ASC',
    [sessionId]
  );
  return rows.map((r: any) => {
    let suggestedProducts = null;
    if (r.suggestedProducts) {
      try {
        suggestedProducts = typeof r.suggestedProducts === 'string' ? JSON.parse(r.suggestedProducts) : r.suggestedProducts;
      } catch (e) {
        suggestedProducts = null;
      }
    }
    return {
      ...r,
      suggestedProducts
    };
  });
};

export const listSessions = async ({ status }: { status?: string } = {}): Promise<ChatSession[]> => {
  const db = await initDb();
  let query = 'SELECT * FROM chat_sessions WHERE 1=1';
  const params: any[] = [];

  if (status && status !== 'all') {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY updatedAt DESC LIMIT 50';
  const [rows]: any = await db.query(query, params);
  return rows as ChatSession[];
};

export const getUnreadTotal = async (): Promise<number> => {
  const db = await initDb();
  const [rows]: any = await db.query('SELECT SUM(unreadByAdmin) as totalUnread FROM chat_sessions');
  return Number(rows[0]?.totalUnread || 0);
};

export default {
  initDb,
  createSession,
  getSessionById,
  updateSession,
  addMessage,
  getMessagesBySessionId,
  listSessions,
  getUnreadTotal
};
