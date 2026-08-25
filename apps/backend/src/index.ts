import 'dotenv/config';
import express from 'express';
import { authRoutes } from './auth/auth.routes.js';

// Módulos adelantados (income, expenses, taxes, emergency-fund, dashboard,
// reports, users) quedan desconectados temporalmente mientras el proyecto
// vuelve a una base mínima de Login + Dashboard. El código sigue intacto
// en sus carpetas dentro de src/ y se puede reconectar reactivando estos
// imports y sus app.use() correspondientes.

const app = express();
const port = 3000;

app.use(express.json());

app.use((req, res, next) => {
    const allowedOrigins = ['http://localhost:4200', 'http://127.0.0.1:4200'];
    const origin = req.headers.origin;

    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }

    next();
});

app.get('/', (req, res) => {
    res.json({ message: 'Numora backend esta corriendo' });
});

app.use('/auth', authRoutes);

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});