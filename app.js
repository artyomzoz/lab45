const express = require('express');
const mariadb = require('mariadb');
const ejs = require('ejs');
const session = require('express-session');
const bodyParser = require('body-parser');
require('dotenv').config();


const app = express();
const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectionLimit: 5
});


app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.set('view engine', 'ejs');

app.use(express.static('public'));

app.get('/', async (req, res) => {
  const pages = await getPages();
  res.render('index', { pages });
});

app.get('/:title', async (req, res) => {
  const title = req.params.title;
  const page = await getPageByTitle(title);
  const pages = await getPages();
  res.render('page', { page, pages });
});

async function getPages() {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query('SELECT * FROM pages ORDER BY menu_order ASC');
    return rows;
  } catch (err) {
    console.log(err);
  } finally {
    if (conn) conn.release();
  }
}

async function getPageByTitle(title) {
  let conn;
  try {
    conn = await pool.getConnection();
        const rows = await conn.query('SELECT * FROM pages WHERE title = ?', [title]);
    if (rows.length > 0) {
      return rows[0];
    }
    return null;
  } catch (err) {
    console.log(err);
  } finally {
    if (conn) conn.release();
  }
}

// Middleware function to check if a user is logged in
function checkAuthentication(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect('/login');
}

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  const user = await getUserByUsername(username);
  if (user && user.password === password) {
    req.session.user = user;
    res.redirect('/admin');
  } else {
    res.render('login', { error: 'Invalid username or password' });
  }
});

app.get('/admin', checkAuthentication, async (req, res) => {
  const pages = await getPages();
  res.render('admin', { pages });
});

app.get('/admin/edit/:id', checkAuthentication, async (req, res) => {
  const id = req.params.id;
  const page = await getPageById(id);
  res.render('edit', { page });
});

app.post('/admin/edit/:id', checkAuthentication, async (req, res) => {
  const id = req.params.id;
  const title = req.body.title;
  const content = req.body.content;
  await updatePage(id, title, content);
  res.redirect('/admin');
});

async function getUserByUsername(username) {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length > 0) {
      return rows[0];
    }
    return null;
  } catch (err) {
    console.log(err);
  } finally {
    if (conn) conn.release();
  }
}

async function getPageById(id) {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query('SELECT * FROM pages WHERE id = ?', [id]);
    if (rows.length > 0) {
      return rows[0];
    }
    return null;
  } catch (err) {
    console.log(err);
  } finally {
    if (conn) conn.release();
  }
}

async function updatePage(id, title, content) {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query('UPDATE pages SET title = ?, content = ? WHERE id = ?', [title, content, id]);
  } catch (err) {
    console.log(err);
  } finally {
    if (conn) conn.release();
  }
}

app.listen(3000, () => {
  console.log('Server started on port 3000');
});
