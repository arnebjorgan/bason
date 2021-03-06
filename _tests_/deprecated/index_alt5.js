import falk from 'falk';
const app = falk.mongodb(process.env.MONGODB_CONNECTIONSTRING);

app.use(middleware);

const cars = app.model('cars');
cars.field('brand', 'string', { required: true });
cars.field('horsePower', 'number');
app.expose(cars);

app.startServer();