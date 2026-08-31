/**
 * Database Connection & Query Interface
 * Supports MySQL (via mysql2/promise) and fallback embedded persistent SQL engine.
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

export interface QueryResult {
  insertId?: number;
  affectedRows?: number;
  [key: string]: any;
}

let mysqlPool: mysql.Pool | null = null;
let useMySQL = false;

// In-memory/file-backed tables for embedded mode
interface DatabaseStore {
  users: any[];
  expenses: any[];
  income: any[];
  budgets: any[];
  ai_insights: any[];
  notifications: any[];
  audit_logs: any[];
  nextIds: { [table: string]: number };
}

const DB_FILE = path.join(process.cwd(), 'data_store.json');

function loadStore(): DatabaseStore {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (!parsed.audit_logs) parsed.audit_logs = [];
      if (!parsed.nextIds.audit_logs) parsed.nextIds.audit_logs = 1;
      return parsed;
    }
  } catch (err) {
    console.error('Error reading local db file:', err);
  }
  return {
    users: [],
    expenses: [],
    income: [],
    budgets: [],
    ai_insights: [],
    notifications: [],
    audit_logs: [],
    nextIds: {
      users: 1,
      expenses: 1,
      income: 1,
      budgets: 1,
      ai_insights: 1,
      notifications: 1,
      audit_logs: 1,
    },
  };
}

let memoryStore: DatabaseStore = loadStore();

function saveStore() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(memoryStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving local store:', err);
  }
}

export async function initDatabase(): Promise<void> {
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'ai_expense_manager';
  const port = parseInt(process.env.DB_PORT || '3306', 10);

  // Try MySQL connection
  try {
    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
    await connection.end();

    mysqlPool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    // Run schema tables
    const schemaSql = fs.readFileSync(path.join(process.cwd(), 'schema.sql'), 'utf-8');
    const statements = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.toLowerCase().startsWith('create database') && !s.toLowerCase().startsWith('use '));

    for (const stmt of statements) {
      if (stmt) {
        await mysqlPool.query(stmt);
      }
    }

    useMySQL = true;
    console.log('✅ Connected successfully to MySQL Database:', database);
  } catch (err: any) {
    console.log('ℹ️  MySQL not detected or unreachable (', err.message, ').');
    console.log('✅ Running embedded resilient SQL engine for persistent CRUD.');
    useMySQL = false;
  }
}

/**
 * Universal Query Executor
 * Executes SQL queries against MySQL or the embedded SQL engine.
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  if (useMySQL && mysqlPool) {
    const [rows] = await mysqlPool.execute(sql, params);
    return rows as T[];
  }

  return executeEmbeddedQuery<T>(sql, params);
}

/**
 * Embedded SQL query parser and executor
 */
function executeEmbeddedQuery<T>(sql: string, params: any[] = []): T[] {
  const trimmed = sql.trim();
  const lower = trimmed.toLowerCase();

  // Normalize parameters
  let paramIndex = 0;
  const nextParam = () => {
    if (paramIndex >= params.length) return undefined;
    return params[paramIndex++];
  };

  // 1. INSERT INTO table (...) VALUES (...)
  if (lower.startsWith('insert into')) {
    const tableMatch = lower.match(/insert into\s+`?([a-z_]+)`?/i);
    if (!tableMatch) return [] as T[];
    const tableName = tableMatch[1] as keyof DatabaseStore;
    if (!memoryStore[tableName]) {
      (memoryStore as any)[tableName] = [];
      if (!memoryStore.nextIds) memoryStore.nextIds = {};
      if (!memoryStore.nextIds[tableName]) memoryStore.nextIds[tableName] = 1;
    }

    const columnsMatch = trimmed.match(/\(([^)]+)\)\s+values/i);
    const columns = columnsMatch ? columnsMatch[1].split(',').map(c => c.trim().replace(/[`]/g, '')) : [];

    const newRecord: any = {
      id: memoryStore.nextIds[tableName]++,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    columns.forEach((col) => {
      newRecord[col] = nextParam();
    });

    // Special handling for booleans and numbers
    if (tableName === 'expenses' || tableName === 'income' || tableName === 'budgets') {
      if (newRecord.amount !== undefined) newRecord.amount = parseFloat(newRecord.amount);
    }
    if (tableName === 'budgets') {
      if (newRecord.month !== undefined) newRecord.month = parseInt(newRecord.month, 10);
      if (newRecord.year !== undefined) newRecord.year = parseInt(newRecord.year, 10);
    }
    if (tableName === 'users') {
      if (newRecord.is_active === undefined) newRecord.is_active = 1;
    }
    if (tableName === 'notifications') {
      if (newRecord.is_read === undefined) newRecord.is_read = 0;
    }

    (memoryStore[tableName] as any[]).push(newRecord);
    saveStore();

    return {
      insertId: newRecord.id,
      affectedRows: 1,
    } as any;
  }

  // 2. UPDATE table SET col1 = ?, col2 = ? WHERE ...
  if (lower.startsWith('update')) {
    const tableMatch = lower.match(/update\s+`?([a-z_]+)`?/i);
    if (!tableMatch) return [] as T[];
    const tableName = tableMatch[1] as keyof DatabaseStore;
    const tableData = (memoryStore[tableName] || []) as any[];

    // Extract SET part
    const setMatch = trimmed.match(/set\s+(.*?)\s+where/i);
    const whereMatch = trimmed.match(/where\s+(.*)$/i);

    const setClauses = setMatch ? setMatch[1].split(',').map(s => s.trim()) : [];
    const setValues: { [key: string]: any } = {};

    setClauses.forEach(clause => {
      const parts = clause.split('=');
      const col = parts[0].trim().replace(/[`]/g, '');
      if (parts[1].trim() === '?') {
        setValues[col] = nextParam();
      } else if (parts[1].trim().toLowerCase() === 'current_timestamp') {
        setValues[col] = new Date().toISOString();
      }
    });

    let matchedCount = 0;
    const wherePredicate = whereMatch ? compileWhereClause(whereMatch[1], () => nextParam()) : () => true;
    tableData.forEach((row: any) => {
      if (wherePredicate(row)) {
        Object.assign(row, setValues, { updated_at: new Date().toISOString() });
        if (row.amount !== undefined) row.amount = parseFloat(row.amount);
        matchedCount++;
      }
    });

    saveStore();
    return { affectedRows: matchedCount } as any;
  }

  // 3. DELETE FROM table WHERE ...
  if (lower.startsWith('delete from')) {
    const tableMatch = lower.match(/delete from\s+`?([a-z_]+)`?/i);
    if (!tableMatch) return [] as T[];
    const tableName = tableMatch[1] as keyof DatabaseStore;
    const tableData = (memoryStore[tableName] || []) as any[];

    const whereMatch = trimmed.match(/where\s+(.*)$/i);
    let deletedCount = 0;
    const wherePredicate = whereMatch ? compileWhereClause(whereMatch[1], () => nextParam()) : () => true;

    const remaining = tableData.filter((row: any) => {
      if (wherePredicate(row)) {
        deletedCount++;
        return false;
      }
      return true;
    });

    (memoryStore as any)[tableName] = remaining;
    saveStore();
    return { affectedRows: deletedCount } as any;
  }

  // 4. SELECT queries
  if (lower.startsWith('select')) {
    return handleSelectQuery<T>(trimmed, params);
  }

  return [] as T[];
}

function compileWhereClause(whereClause: string, getParam: () => any): (row: any) => boolean {
  const andTokens = whereClause.split(/\s+and\s+/i);
  const compiledAnds = andTokens.map(token => {
    const cleanToken = token.trim().replace(/^\(|\)$/g, '');
    if (cleanToken.toLowerCase().includes(' or ')) {
      const orTokens = cleanToken.split(/\s+or\s+/i);
      const compiledOrs = orTokens.map(orT => compileSingleCondition(orT.trim(), getParam));
      return (row: any) => compiledOrs.some(fn => fn(row));
    }
    return compileSingleCondition(cleanToken, getParam);
  });

  return (row: any) => compiledAnds.every(fn => fn(row));
}

function compileSingleCondition(condition: string, getParam: () => any): (row: any) => boolean {
  const isParam = condition.includes('?');
  const boundVal = isParam ? getParam() : undefined;

  const colMatch = condition.match(/^(`?[a-z_]+`?\.)?`?([a-z_]+)`?/i);
  if (!colMatch) return () => true;
  const col = colMatch[2];

  const lower = condition.toLowerCase();
  if (lower.includes('is not null')) {
    return (row: any) => row[col] !== null && row[col] !== undefined;
  }
  if (lower.includes('is null')) {
    return (row: any) => row[col] === null || row[col] === undefined;
  }
  if (lower.includes('like')) {
    if (boundVal === undefined || boundVal === null) return () => true;
    const pattern = String(boundVal).replace(/%/g, '.*');
    const regex = new RegExp(`^${pattern}$`, 'i');
    return (row: any) => regex.test(String(row[col] || ''));
  }
  if (condition.includes('!=') || condition.includes('<>')) {
    return (row: any) => String(row[col]) !== String(boundVal);
  }
  if (condition.includes('>=')) {
    return (row: any) => Number(row[col]) >= Number(boundVal);
  }
  if (condition.includes('<=')) {
    return (row: any) => Number(row[col]) <= Number(boundVal);
  }
  if (condition.includes('>')) {
    return (row: any) => Number(row[col]) > Number(boundVal);
  }
  if (condition.includes('<')) {
    return (row: any) => Number(row[col]) < Number(boundVal);
  }
  if (condition.includes('=')) {
    return (row: any) => String(row[col]) === String(boundVal);
  }
  return () => true;
}

function handleSelectQuery<T>(sql: string, params: any[]): T[] {
  let paramIndex = 0;
  const getParam = () => {
    if (paramIndex >= params.length) return undefined;
    return params[paramIndex++];
  };

  const lower = sql.toLowerCase();
  
  // Identify main table
  const fromMatch = sql.match(/from\s+`?([a-z_]+)`?(\s+as\s+`?[a-z_]+`?|\s+[a-z])?/i);
  if (!fromMatch) return [];
  const mainTable = fromMatch[1].toLowerCase() as keyof DatabaseStore;
  const rawTable = memoryStore[mainTable];
  let rows: any[] = Array.isArray(rawTable) ? [...rawTable] : [];

  // Apply WHERE filtering
  const whereMatch = sql.match(/where\s+(.*?)(?:\s+group\s+by|\s+order\s+by|\s+limit|$)/i);
  if (whereMatch) {
    const wherePredicate = compileWhereClause(whereMatch[1], getParam);
    rows = rows.filter(wherePredicate);
  }

  // Handle COUNT(*) / SUM / AVG aggregations
  if (lower.includes('count(*)') || lower.includes('sum(') || lower.includes('avg(')) {
    const resultRow: any = {};
    if (lower.includes('count(*) as count') || lower.includes('count(*) as total')) {
      const key = lower.includes('as total') ? 'total' : 'count';
      resultRow[key] = rows.length;
    }
    if (lower.includes('sum(amount) as total_amount') || lower.includes('sum(amount) as total')) {
      const key = lower.includes('as total_amount') ? 'total_amount' : 'total';
      const sum = rows.reduce((acc, r) => acc + (parseFloat(r.amount) || 0), 0);
      resultRow[key] = sum;
    }

    // Group By handling
    const groupByMatch = sql.match(/group\s+by\s+`?([a-z_]+)`?/i);
    if (groupByMatch) {
      const groupCol = groupByMatch[1];
      const groups: { [key: string]: any[] } = {};
      rows.forEach(r => {
        const key = r[groupCol] || 'Other';
        if (!groups[key]) groups[key] = [];
        groups[key].push(r);
      });

      const groupedResults: any[] = [];
      for (const [key, groupRows] of Object.entries(groups)) {
        const rowObj: any = { [groupCol]: key };
        if (lower.includes('sum(amount)')) {
          rowObj.total = groupRows.reduce((acc, r) => acc + (parseFloat(r.amount) || 0), 0);
          rowObj.total_amount = rowObj.total;
        }
        if (lower.includes('count(*)')) {
          rowObj.count = groupRows.length;
        }
        groupedResults.push(rowObj);
      }
      return sortAndLimit(groupedResults, sql, getParam) as T[];
    }

    return [resultRow] as T[];
  }

  // Handle ORDER BY and LIMIT
  return sortAndLimit(rows, sql, getParam) as T[];
}

function sortAndLimit(rows: any[], sql: string, getParam: () => any): any[] {
  let result = [...rows];

  // ORDER BY
  const orderMatch = sql.match(/order\s+by\s+(`?[a-z_]+`?\.)?`?([a-z_]+)`?\s*(asc|desc)?/i);
  if (orderMatch) {
    const col = orderMatch[2];
    const direction = (orderMatch[3] || 'asc').toLowerCase();
    result.sort((a, b) => {
      let valA = a[col];
      let valB = b[col];
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;
      if (!isNaN(Number(valA)) && !isNaN(Number(valB))) {
        return direction === 'desc' ? Number(valB) - Number(valA) : Number(valA) - Number(valB);
      }
      return direction === 'desc'
        ? String(valB).localeCompare(String(valA))
        : String(valA).localeCompare(String(valB));
    });
  }

  // LIMIT & OFFSET
  const limitMatch = sql.match(/limit\s+(\d+|\?)(?:\s+offset\s+(\d+|\?)|\s*,\s*(\d+|\?))?/i);
  if (limitMatch) {
    let limit = limitMatch[1] === '?' ? getParam() : parseInt(limitMatch[1], 10);
    let offset = 0;
    if (limitMatch[2]) {
      offset = limitMatch[2] === '?' ? getParam() : parseInt(limitMatch[2], 10);
    } else if (limitMatch[3]) {
      offset = limit;
      limit = limitMatch[3] === '?' ? getParam() : parseInt(limitMatch[3], 10);
    }
    result = result.slice(offset, offset + limit);
  }

  return result;
}

export default {
  query,
  initDatabase,
};
