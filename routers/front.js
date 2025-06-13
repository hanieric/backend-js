const express = require('express')
const mysql = require('mysql2');
const router = express.Router()
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const connection = mysql.createConnection({
    host: 'sql12.freesqldatabase.com',
    user: 'sql12677382',
    password: 'IpqW6Appgu',
    database: 'sql12677382',
});

router.get('/',(req,res)=>{
    res.send('WELCOME TO MY FINANCIAL WEB')
})

router.post('/register',(req,res)=>{
    const user = req.body

    if (!user.username || !user.password) {
        res.status(400).send('wajib menyertakan username dan password')
        return;
    }

    bcrypt.hash(user.password, 10, (err, result) => {
        if (err) {
        res.status(500).send('masalah dengan server')
        return;
        }
        
        const q = `INSERT INTO user (username, password) VALUES ('${user.username}', '${result}')`
        connection.query(q, (err, result) => {
            if (err) {
                res.status(500).send('Ada masalah dengan hubungan ke server')
                console.error(err)
                return;
            }
            
            res.status(201).send('Registrasi User berhasil')
        })
    })
})

router.post('/login',(req,res)=>{
  const user = req.body;
  const q = `SELECT * FROM user WHERE username = '${user.username}'`
  connection.query(q, (err, result) => {
    if (err) {
        res.status(500).send('Ada masalah dengan hubungan ke server')
        console.error(err)
        return;
    }
    
    if(result.length > 0){
    bcrypt.compare(user.password, result[0].password, (err, hasilCompare) => {
      if (err) {
        res.status(500).send('ada masalah pada server')
        return
      }
  
      if (hasilCompare) {
        req.user = result[0]
        const token = jwt.sign({ userId: result[0].id}, 'naruto0105', { expiresIn: '6h' });
        req.session.token = token;
        res.status(200).send({token:token,user : result[0]});
        return
      } else {
        res.status(401).send('gagal login');
        return
      }
    });
    }

    else{
      res.status(404).send('username tidak ditemukan')
    }
  });
});

router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.send('Error saat logout');
      return
    }
    res.status(200).send('Berhasil logout')
  });
});

module.exports = router