const jwt = require('jsonwebtoken');

const verifyToken = (req) => {
    let token = req.headers['authorization'];
    if (!token) throw { status: 403, message: 'No token provided!' };
    if (token.startsWith('Bearer ')) token = token.slice(7);
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded.id;
    } catch {
        throw { status: 401, message: 'Unauthorized!' };
    }
};

module.exports = { verifyToken };
