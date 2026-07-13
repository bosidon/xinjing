const jwt = require('jsonwebtoken');

// JWT认证中间件
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            success: false,
            error: '访问令牌缺失'
        });
    }
    
    try {
        const decoded = jwt.verify(
            token, 
            process.env.JWT_SECRET || 'your-secret-key-change-in-production'
        );
        
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: '访问令牌已过期'
            });
        }
        
        return res.status(403).json({
            success: false,
            error: '无效的访问令牌'
        });
    }
}

// 可选认证中间件（不强制要求认证）
function optionalAuthenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        req.user = null;
        return next();
    }
    
    try {
        const decoded = jwt.verify(
            token, 
            process.env.JWT_SECRET || 'your-secret-key-change-in-production'
        );
        
        req.user = decoded;
        next();
    } catch (error) {
        // 令牌无效，但不阻止请求
        req.user = null;
        next();
    }
}

// 管理员认证中间件
function authenticateAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            success: false,
            error: '访问令牌缺失'
        });
    }
    
    try {
        const decoded = jwt.verify(
            token, 
            process.env.JWT_SECRET || 'your-secret-key-change-in-production'
        );
        
        // 检查用户是否是管理员
        // 这里需要根据你的用户角色系统进行调整
        if (!decoded.isAdmin) {
            return res.status(403).json({
                success: false,
                error: '需要管理员权限'
            });
        }
        
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: '访问令牌已过期'
            });
        }
        
        return res.status(403).json({
            success: false,
            error: '无效的访问令牌'
        });
    }
}

// 速率限制中间件（简单版本）
function rateLimit(requestsPerMinute = 60) {
    const requests = new Map();
    
    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        const windowStart = now - 60000; // 1分钟
        
        // 清理过期的请求记录
        for (const [key, timestamps] of requests.entries()) {
            const validTimestamps = timestamps.filter(time => time > windowStart);
            if (validTimestamps.length === 0) {
                requests.delete(key);
            } else {
                requests.set(key, validTimestamps);
            }
        }
        
        // 获取当前IP的请求时间戳
        const ipRequests = requests.get(ip) || [];
        
        // 检查是否超过限制
        if (ipRequests.length >= requestsPerMinute) {
            return res.status(429).json({
                success: false,
                error: '请求过于频繁，请稍后再试'
            });
        }
        
        // 记录本次请求
        ipRequests.push(now);
        requests.set(ip, ipRequests);
        
        next();
    };
}

module.exports = {
    authenticateToken,
    optionalAuthenticateToken,
    authenticateAdmin,
    rateLimit
};