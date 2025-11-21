import jwt from 'jsonwebtoken';

export function wsAuth(socket, next) {
  const token = socket.handshake.query.token || socket.handshake.headers['authorization'];
  if (!token) return next(new Error('Authentication required'));
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Invalid token'));
    socket.user = decoded;
    next();
  });
}
// Usage: io.use(wsAuth); 