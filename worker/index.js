const keys = require('./keys');
const redis = require('redis');

// host, port and milli secs to restart
const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
});
const sub = redisClient.duplicate();

function fib(index) {
    if(index < 2) return 1;
    return fib(index - 1) + fib(index - 2);
}
// values is a dictionary and it is hashed and message is the index
// and fib(message) is the calculated value 
sub.on('message', (channel, message) => {
    redisClient.hset('values', message, fib(parseInt(message)));
});
// if there is ever a insert do the above code
sub.subscribe('insert');