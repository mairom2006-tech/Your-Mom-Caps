const express = require("express");
const bcrypt = require("bcrypt");

const app = express();
const PORT = process.env.PORT || 5500;

app.use(express.json());
app.use(express.static(__dirname));

const users = new Map();

app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ ok: false, error: "Faltan usuario o contraseña" });
    }

    const key = String(username).trim().toLowerCase();
    if (users.has(key)) {
      return res.status(409).json({ ok: false, error: "Ese usuario ya existe" });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(String(password), saltRounds);
    users.set(key, { username: String(username).trim(), passwordHash });

    return res.status(201).json({
      ok: true,
      message: "Usuario registrado con bcrypt",
      user: String(username).trim(),
      passwordHash
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Error en el servidor" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ ok: false, error: "Faltan usuario o contraseña" });
    }

    const key = String(username).trim().toLowerCase();
    const record = users.get(key);
    if (!record) {
      return res.status(401).json({ ok: false, error: "Credenciales inválidas" });
    }

    const matches = await bcrypt.compare(String(password), record.passwordHash);
    if (!matches) {
      return res.status(401).json({ ok: false, error: "Credenciales inválidas" });
    }

    return res.json({
      ok: true,
      message: "Acceso concedido",
      user: record.username
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Error al verificar contraseña" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://127.0.0.1:${PORT}/index.html`);
});