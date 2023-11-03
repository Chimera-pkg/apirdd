const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const app = express();
const mysql = require('mysql');

const db = mysql.createConnection({
  host: 'rdd-api.x-camp.id',
  user: 'alitadev_db_rdd',
  password: 'tP(;@rPnqe(u',
  database: 'alitadev_db_rdd'
})

const serverURL = 'http://api-rdd.x-camp.id'


app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.get("/getSummary", (req, res) => {
  fs.readFile("./data/summary.json", "utf8", (err, data) => {
    if (err) {
      console.error("Error reading summary.json:", err);
      res.status(500).json({ error: "back end e error jancok" });
    } else {
      const summaryData = JSON.parse(data);
      res.json(summaryData);
    }
  });
});

// pake cors
app.use(cors({
	credentials: true, // allow cookies to be sent across domains
  origin: ['https://roadinspecx.x-camp.id'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Direktori penyimpanan file
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Nama file yang disimpan sama dengan nama asli file
  }
});
const upload = multer({ storage });

// backend history_log mysql db
// get all history for dashboard
app.get('/history', (req, res)=>{
  const sql = "SELECT * FROM history_log";
  db.query(sql, (err, data)=>{
    if(err) return res.json(err);
    return res.json(data);
  })
})

// history log page data supply
app.get('/get-history', (req, res)=>{
  const fileNameFromBody = req.query.fileName;
  console.log(fileNameFromBody)
  if (!fileNameFromBody)
  {
    const sql = "SELECT * FROM history_log ORDER BY id DESC LIMIT 1";
    db.query(sql, (err, data)=>{
      if(err) return res.json(err);
      return res.json(data);
    })
  }
  else
  {
    const sql = "SELECT * FROM history_log WHERE nama_file = \""+fileNameFromBody+"\" ORDER BY id DESC LIMIT 1";
    db.query(sql, (err, data)=>{
      if(err) return res.json(err);
      return res.json(data);
    })
  }
})

// backend upload gambar

app.post('/upload', upload.single('file'), (req, res) => {
  console.log(req.body);
  console.log(req.file);
  res.send('File uploaded successfully.');
});

app.get('/start-detection', (req, res) => {
    const fileNameFromBody = req.query.fileName; 
    const namaFileOnly = path.parse(fileNameFromBody).name;

    if (!fileNameFromBody) {
      return res.status(400).json({ error: 'File name is missing in the request parameters.' });
    }

    const uploadedFilePath = path.join(__dirname, 'uploads', fileNameFromBody);

  
    fs.access(uploadedFilePath, fs.constants.F_OK, (accessError) => {
      if (accessError) {
        return res.status(404).json({ error: 'File not found.' });
      }
  
      const fileExtension = path.extname(fileNameFromBody);
      const script = fileExtension.toLowerCase() === '.mp4' ? 'predict_video.py' : 'predict_image.py';
  
      exec(`source /home/alitadev/virtualenv/rddapi-python/3.8/bin/activate && cd /home/alitadev/apirdd && python ${script} "${uploadedFilePath}"`, (error, stdout, stderr) => {
        console.log(`Execution of ${script} for file ${uploadedFilePath} completed.`);
        if (error) {
          console.error(`Error executing ${script}: ${error}`);
          return res.status(500).json({ error: `Error executing ${script}` });
        } else {
          console.log(`Execution of ${script} for file ${uploadedFilePath} completed.`);
  
          const outputFilePath = "./uploads/"+namaFileOnly+'_summary.json';
          fs.readFile(outputFilePath, 'utf8', (readError, data) => {
                if (readError) {
                console.error('Error reading JSON output:', readError);
                res.status(500).send('Error reading JSON output');
                } else {
                try {
                    const results = JSON.parse(data);
                    const historyData = {
                    nama_file: fileNameFromBody,
                    before_detection: `${serverURL}/uploads/${fileNameFromBody}`,
                    after_detection: `${serverURL}/uploads/${fileNameFromBody.replace(/\.\w+$/, '_output')}${fileExtension}`,
                    lubang: 0,
                    lubang_confidence: 0,
                    retak_melintang: 0,
                    retak_melintang_confidence: 0,
                    retak_memanjang: 0,
                    retak_memanjang_confidence: 0,
                    retak_buaya: 0,
                    retak_buaya_confidence: 0,
                    };
            
                    if (Array.isArray(results)) {
                    // Handle multiple damage types
                    results.forEach(result => {
                        const damageType = Object.keys(result)[0];
                        historyData[damageType] = result[damageType].count || 0;
                        historyData[`${damageType}_confidence`] = result[damageType].confidence_sum || 0;
                    });
                    } else if (typeof results === 'object') {
                    // Handle singular damage type
                    const damageType = Object.keys(results)[0];
                    historyData[damageType] = results[damageType].count || 0;
                    historyData[`${damageType}_confidence`] = results[damageType].confidence_sum || 0;
                    }
            
                    // Set the created_at and updated_at timestamps
                    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
                    historyData.created_at = now;
                    historyData.updated_at = now;
            
                    // Insert the data into the database
                    db.query('INSERT INTO history_log SET ?', historyData, (dbError, dbResult) => {
                    if (dbError) {
                        console.error('Error inserting data into the database:', dbError);
                        res.status(500).send('Error inserting data into the database');
                    } else {
                        console.log('Data inserted into the database.');
                    }
                    });
            
                    res.send('File processed successfully and data inserted into the database.');
                } catch (parseError) {
                    console.error('Error parsing JSON output:', parseError);
                    res.status(500).send('Error parsing JSON output');
                }
                }
          });
        }
      });
    });
});
  

app.get('/check', (req, res) => {
  const fileNameFromBody = 'Sumatra Selatan';
  const fileExtension = path.extname(fileNameFromBody);
  const outputFilePath = "./uploads/"+fileNameFromBody+'_summary.json';
  fs.readFile(outputFilePath, 'utf8', (readError, data) => {
    if (readError) {
      console.error('Error reading JSON output:', readError);
      res.status(500).send('Error reading JSON output');
    } else {
      try {
        const results = JSON.parse(data);
        const historyData = {
          nama_file: fileNameFromBody,
          before_detection: `${serverURL}/uploads/${fileNameFromBody}`,
          after_detection: `${serverURL}/uploads/${fileNameFromBody.replace(/\.\w+$/, '_output')}${fileExtension}`,
          lubang: 0,
          lubang_confidence: 0,
          retak_melintang: 0,
          retak_melintang_confidence: 0,
          retak_memanjang: 0,
          retak_memanjang_confidence: 0,
          retak_buaya: 0,
          retak_buaya_confidence: 0,
        };
  
        if (Array.isArray(results)) {
          // Handle multiple damage types
          results.forEach(result => {
            const damageType = Object.keys(result)[0];
            historyData[damageType] = result[damageType].count || 0;
            historyData[`${damageType}_confidence`] = result[damageType].confidence_sum || 0;
          });
        } else if (typeof results === 'object') {
          // Handle singular damage type
          const damageType = Object.keys(results)[0];
          historyData[damageType] = results[damageType].count || 0;
          historyData[`${damageType}_confidence`] = results[damageType].confidence_sum || 0;
        }
  
        // Set the created_at and updated_at timestamps
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        historyData.created_at = now;
        historyData.updated_at = now;
  
        // Insert the data into the database
        db.query('INSERT INTO history_log SET ?', historyData, (dbError, dbResult) => {
          if (dbError) {
            console.error('Error inserting data into the database:', dbError);
            res.status(500).send('Error inserting data into the database');
          } else {
            console.log('Data inserted into the database.');
          }
        });
  
        res.send('File processed successfully and data inserted into the database.');
      } catch (parseError) {
        console.error('Error parsing JSON output:', parseError);
        res.status(500).send('Error parsing JSON output');
      }
    }
  });
});

app.listen(3001, () => {
  console.log('Server is running');
});
