import pool from '../config/postgres.js';
import bcrypt from 'bcryptjs';

export const userSqlRepository = {
  async create({ name, email, password }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const query = `
      INSERT INTO users (name, email, password)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, level, points, created_at
    `;
    
    const result = await pool.query(query, [name, email, hashedPassword]);
    return result.rows[0];
  },

  async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0];
  },

  async findById(id) {
    const query = 'SELECT id, name, email, level, points, created_at FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
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
