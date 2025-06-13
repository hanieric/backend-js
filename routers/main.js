const express = require('express')
const mysql = require('mysql2');
const router = express.Router();
const jwt = require('jsonwebtoken');
const socketIO = require('socket.io');
const http = require('http');
const connection = mysql.createConnection({
    host: 'sql12.freesqldatabase.com',
    user: 'sql12677382',
    password: 'IpqW6Appgu',
    database: 'sql12677382',
});
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

router.use((req,res,next)=>{
    const token  = req.body;
  
    if (token.session) {
      jwt.verify(token.session, 'naruto0105', (err, decoded) => {
        if (err) {
          console.error(err);
          return res.status(401).send('Token tidak valid. Silakan login.');
        }
        req.userId = decoded.userId;
        next();
      });
    } else {
      res.status(401).send('Tidak ada token bro')
    }
  });

//dashboard("/" milik main)
router.post('/dashboard', (req, res) => {
if (req.userId) {
    res.status(200).send({userId : req.userId,session : req.session});
} else {
    res.status(401).send('Token expired').redirect('/login');
}
});


router.post('/save', (req, res) => {
    const data  = req.body;
    const q = `INSERT INTO pengeluaran (user_id, nama_pengeluaran, jumlah_pengeluaran) VALUES (${data.userid}, '${data.pengeluaran}',${data.jumlah})`
    connection.query(q,(err, result) => {
    if (err) {
        res.status(500).send('Ada masalah dengan hubungan ke server')
        console.error(err)
        return;
    }
    res.status(200).send('yeay, data pengeluaran berhasil ditambahkan')
    })
});

router.post('/show', (req, res) => {
  const user = req.body;
  let hasil = []
  const q = `SELECT id, nama_pengeluaran, jumlah_pengeluaran FROM pengeluaran WHERE user_id=${user.id}`
  const q1 = `SELECT SUM(jumlah_pengeluaran) AS total_pengeluaran FROM pengeluaran WHERE user_id = ${user.id};`
  connection.query(q,(err, result) => {
      if (err) {
      res.status(500).send('Ada masalah dengan hubungan ke server')
      console.error(err)
      return;
      }
      hasil.push(result)
      connection.query(q1,(err, result) => {
        if (err) {
        res.status(500).send('Ada masalah dengan hubungan ke server')
        console.error(err)
        return;
        }
        hasil.push(result)
        res.status(200).send(hasil)
      })
  })
})
    
router.post('/erase', (req, res) => {
  const item = req.body;  
  const q = `DELETE FROM pengeluaran WHERE id=${item.id}`
  connection.query(q,(err, result) => {
    if (err) {
    res.status(500).send('Ada masalah dengan hubungan ke server')
    console.error(err)
    return;
    }
    
    if (result.affectedRows === 1) {
    res.status(200).send('data pengeluaran berhasil dihapus')
    } else {
    res.status(404).send('data pengeluaran tidak ditemukan')
    }
  })
})

module.exports = router