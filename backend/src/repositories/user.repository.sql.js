import pool from '../config/postgres.js';
import bcrypt from 'bcryptjs';

export const userSqlRepository = {
  async create({ name, email, password, role = 'student' }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const safeRole = role === 'admin' ? 'admin' : 'student';
    
    const query = `
      INSERT INTO users (name, email, password, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role, level, points, created_at, last_active_at
    `;
    
    const result = await pool.query(query, [name, email, hashedPassword, safeRole]);
    return result.rows[0];
  },

  async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0];
  },

  async findById(id) {
    const query = 'SELECT id, name, email, role, level, points, created_at, last_active_at FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  async markActive(id) {
    const query = `
      UPDATE users
      SET last_active_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, name, email, role, level, points, created_at, last_active_at
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  async ensureAdmin({ name, email, password }) {
    const existing = await this.findByEmail(email);
    const hashedPassword = await bcrypt.hash(password, 10);

    if (existing) {
      const result = await pool.query(
        `UPDATE users
         SET name = $1, password = $2, role = $3
         WHERE id = $4
         RETURNING id, name, email, role, level, points, created_at, last_active_at`,
        [name, hashedPassword, 'admin', existing.id],
      );
      return result.rows[0];
    }

    return this.create({ name, email, password, role: 'admin' });
  },

  async listStudents({ search = '', limit = 25, offset = 0 } = {}) {
    const values = ['student', Math.min(Number(limit) || 25, 100), Math.max(Number(offset) || 0, 0)];
    let where = 'WHERE role = $1';

    if (search) {
      values.push(`%${search}%`);
      where += ` AND (name ILIKE $4 OR email ILIKE $4)`;
    }

    const query = `
      SELECT id, name, email, role, level, points, created_at, last_active_at, COUNT(*) OVER() AS total_count
      FROM users
      ${where}
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(query, values);
    return {
      students: result.rows,
      total: Number(result.rows[0]?.total_count || 0),
    };
  },

  async countStudents() {
    const result = await pool.query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'student'");
    return result.rows[0]?.count || 0;
  },

  async updatePoints(id, points) {
    const query = `
      UPDATE users 
      SET points = points + $1 
      WHERE id = $2 
      RETURNING id, name, email, level, points
    `;
    const result = await pool.query(query, [points, id]);
    return result.rows[0];
  },

  async updateLevel(id, level) {
    const query = `
      UPDATE users 
      SET level = $1 
      WHERE id = $2 
      RETURNING id, name, email, level, points
    `;
    const result = await pool.query(query, [level, id]);
    return result.rows[0];
  },
};
