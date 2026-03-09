const errorHandler = (err, _req, res, _next) => {
  console.error(err.stack);

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: 'Doğrulama hatası', errors: messages });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'alan';
    const messages = {
      email: 'Bu email adresi zaten kayıtlı',
      coupon_id: 'Bu kupon için analiz zaten mevcut',
    };
    return res.status(409).json({ message: messages[field] || `Bu ${field} zaten kullanılıyor` });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Geçersiz token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token süresi dolmuş' });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || 'Sunucu hatası',
  });
};

module.exports = errorHandler;
