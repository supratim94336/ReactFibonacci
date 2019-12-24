const keys = require('./keys');

// express setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Postgres Client Setup
const { Pool } = require('pg');
const pgClient = new Pool ({
    user: keys.pgUser,
    host: keys.pgHost,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port: keys.pgPort
});
pgClient.on('error', () => console.log('Lost Postgres connection'));
pgClient.query('CREATE TABLE IF NOT EXISTS values (number INT)')
        .catch((err) => console.log(err));

// redis client setup
const redis = require('redis');
const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
});
// according to redis documentation for this java script library,
//  if we ever have a client that is listening or publishing 
// material on redis connection it may not be used for other 
// services, so a duplicate
const redisPublisher = redisClient.duplicate();

// express route handlers
app.get('/', (req, res) => {
    res.send('Hi');
});

app.get('/values/all', async(req, res) => {
    const values = await pgClient.query('SELECT * from values')
    res.send(values.rows);
});

app.get('/values/current', async(req, res) => {
    redisClient.hgetall('values', (err, values) => {
        res.send(values);
    });
});

app.post('/values', async(req, res) => {
    const index = req.body.index;
    if(parseInt(index) > 40) {
        return res.status(422).send('Index too high');
    }
    // setting the key with value nothing yet and then
    // publish to insert the fibonacci of the index
    redisClient.hset('values', index, 0);
    redisPublisher.publish('insert', index);
    pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);
    res.send({ working: true });
});

app.listen(5000, err => {
    console.log('Listening');
});