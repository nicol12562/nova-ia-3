-- Nova IA — esquema D1
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT,
  salt TEXT,
  plan TEXT NOT NULL DEFAULT 'gratis',
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL DEFAULT 'Nuevo chat',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id),
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS usage_daily (
  user_id INTEGER NOT NULL REFERENCES users(id),
  day TEXT NOT NULL,
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, day)
);

-- Tickets de un solo uso: state de OAuth y tickets de sesión temporal
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

-- Configuración editable desde el panel (hoy: 'model' = modelo global forzado)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tokens consumidos por modelo dentro del mes. Es lo que hace cumplir los techos
-- que se muestran en Planes y en el selector del chat.
CREATE TABLE IF NOT EXISTS model_usage (
  user_id INTEGER NOT NULL REFERENCES users(id),
  model TEXT NOT NULL,
  month TEXT NOT NULL,
  tokens INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, model, month)
);

-- Pruebas de la demo comparativa, por usuario y día (tope 3 en /api/demo)
CREATE TABLE IF NOT EXISTS demo_usage (
  user_id INTEGER NOT NULL REFERENCES users(id),
  day TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);

-- Mensajes de visitantes sin sesión, por IP y día (tope GUEST_LIMIT en chat.js)
CREATE TABLE IF NOT EXISTS guest_usage (
  ip TEXT NOT NULL,
  day TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip, day)
);

-- Notas de largo plazo que el usuario guarda y entran al system prompt de cada
-- conversación. Es lo que hace que volver a Nova sirva más que pagar la API.
CREATE TABLE IF NOT EXISTS memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  note TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id);

-- Contador de intentos por IP y ventana (login/registro). Sin esto se podían
-- probar contraseñas al infinito.
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT NOT NULL,
  ventana INTEGER NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, ventana)
);

-- Conversaciones fijadas arriba del sidebar.
ALTER TABLE conversations ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;

-- Estado de cada upstream para el reintento con breaker. `until` en UTC: mientras
-- no venza, ese proveedor se saltea en vez de golpearlo otra vez.
CREATE TABLE IF NOT EXISTS upstream_health (
  upstream TEXT PRIMARY KEY,
  fails INTEGER NOT NULL DEFAULT 0,
  until TEXT,
  last_status INTEGER,
  last_reason TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
ALTER TABLE upstream_health ADD COLUMN last_reason TEXT;

-- Cola de aprobación del panel. Nada de lo que se edita en #/admin toca la base
-- hasta que se aprueba acá. before_value es lo que se vio al proponer: si al
-- aprobar el valor real ya es otro, el cambio queda 'stale' con el motivo.
CREATE TABLE IF NOT EXISTS admin_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('plan','model')),
  target TEXT NOT NULL,
  label TEXT NOT NULL,
  before_value TEXT NOT NULL DEFAULT '',
  after_value TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','applied','rejected','stale')),
  actor TEXT,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  decided_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_admin_changes_estado ON admin_changes(status, id);
