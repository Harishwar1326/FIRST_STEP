import { query } from '../config/postgres.js';
import bcrypt from 'bcryptjs';

export const normalizeStudentListOptions = ({ search = '', limit = 25, offset = 0 } = {}) => {
  const parsedLimit = Number(limit)
  const parsedOffset = Number(offset)
  return {
    search: String(search ?? '').trim().slice(0, 100),
    limit: Math.min(100, Math.max(1, Math.floor(Number.isFinite(parsedLimit) && parsedLimit ? parsedLimit : 25))),
    offset: Math.min(100000, Math.max(0, Math.floor(Number.isFinite(parsedOffset) ? parsedOffset : 0))),
  }
}

export const userSqlRepository = {
  async create({ name, email, password, role = 'student' }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const safeRole = role === 'admin' ? 'admin' : 'student';
    
    const sql = `
      INSERT INTO users (name, email, password, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role, level, points, created_at, last_active_at
    `;
    
    const result = await query(sql, [name.trim(), email.trim().toLowerCase(), hashedPassword, safeRole]);
    return result.rows[0];
  },

  async findByEmail(email) {
    const sql = 'SELECT * FROM users WHERE LOWER(email) = LOWER($1) ORDER BY id LIMIT 1';
    const result = await query(sql, [email.trim()]);
    return result.rows[0];
  },

  async findById(id) {
    const sql = 'SELECT id, name, email, role, level, points, created_at, last_active_at FROM users WHERE id = $1';
    const result = await query(sql, [id]);
    return result.rows[0];
  },

  async markActive(id) {
    const sql = `
      UPDATE users
      SET last_active_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, name, email, role, level, points, created_at, last_active_at
    `;
    const result = await query(sql, [id]);
    return result.rows[0];
  },

  async ensureAdmin({ name, email, password }) {
    const existing = await this.findByEmail(email);
    if (existing) {
      // Startup must never reset a configured administrator's credentials or
      // silently elevate an existing student account.
      return existing.role === 'admin' ? existing : null;
    }

    return this.create({ name, email, password, role: 'admin' });
  },

  async listStudents({ search = '', limit = 25, offset = 0 } = {}) {
    ({ search, limit, offset } = normalizeStudentListOptions({ search, limit, offset }))
    const values = ['student', limit, offset];
    let where = 'WHERE role = $1';

    if (search) {
      values.push(`%${search}%`);
      where += ` AND (name ILIKE $4 OR email ILIKE $4)`;
    }

    const sql = `
      SELECT id, name, email, role, level, points, created_at, last_active_at, COUNT(*) OVER() AS total_count
      FROM users
      ${where}
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await query(sql, values);
    return {
      students: result.rows,
      total: Number(result.rows[0]?.total_count || 0),
    };
  },

  async countStudents() {
    const result = await query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'student'");
    return result.rows[0]?.count || 0;
  },

  async countActiveStudentsSince(since) {
    const result = await query(
      "SELECT COUNT(*)::int AS count FROM users WHERE role = 'student' AND last_active_at >= $1",
      [since],
    )
    return result.rows[0]?.count || 0
  },

  async updatePoints(id, points) {
    const sql = `
      UPDATE users 
      SET points = points + $1 
      WHERE id = $2 
      RETURNING id, name, email, level, points
    `;
    const result = await query(sql, [points, id]);
    return result.rows[0];
  },

  async updateLevel(id, level) {
    const sql = `
      UPDATE users 
      SET level = $1 
      WHERE id = $2 
      RETURNING id, name, email, level, points
    `;
    const result = await query(sql, [level, id]);
    return result.rows[0];
  },
};

export default userSqlRepository;
