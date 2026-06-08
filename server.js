const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PUERTO = process.env.PORT || 3000;

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// --- 1. CONEXIÓN A MONGODB ATLAS ---
// CORRECCIÓN: Usar variable de entorno para no exponer la contraseña.
// Crea un archivo .env con: MONGO_URI=mongodb+srv://admin:Veterinaria123*@...
// O bien, si no usas dotenv, deja la cadena directa aquí solo en desarrollo local.
const mongoURI = process.env.MONGO_URI || 'mongodb+srv://admin:Veterinaria123*@cluster0.qw3g6u6.mongodb.net/veterinaria?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(mongoURI, {
    serverSelectionTimeoutMS: 10000,  // CORRECCIÓN: Evita que el servidor se congele esperando conexión
    socketTimeoutMS: 45000,
})
.then(() => console.log('==> ¡Conectado exitosamente a MongoDB Atlas!'))
.catch(err => {
    console.error('==> ERROR al conectar a MongoDB Atlas:', err.message);
    console.error('==> Verifica: 1) Tu IP está en la lista blanca de Atlas, 2) Usuario/contraseña correctos, 3) Nombre del cluster correcto.');
    process.exit(1); // CORRECCIÓN: Detiene el servidor si no hay conexión, en vez de fallar silenciosamente
});

// CORRECCIÓN: Escuchar eventos de desconexión en tiempo de ejecución
mongoose.connection.on('disconnected', () => {
    console.warn('==> MongoDB desconectado. Intentando reconectar...');
});
mongoose.connection.on('reconnected', () => {
    console.log('==> MongoDB reconectado exitosamente.');
});


// --- 2. DEFINICIÓN DE MODELOS (SCHEMAS) ---

const ClienteSchema = new mongoose.Schema({
    id_cliente: { type: String, required: true, unique: true },
    nombre_cliente: String,
    telefono: String,
    direccion: String,
    email: String
}, { versionKey: false });
const Cliente = mongoose.model('clientes', ClienteSchema);

const MascotaSchema = new mongoose.Schema({
    id_mascota: { type: String, required: true, unique: true },
    nombre_mascota: String,
    raza: String,
    sexo: String,
    edad: String,
    numero_microchip: String
}, { versionKey: false });
const Mascota = mongoose.model('mascotas', MascotaSchema);

const VeterinarioSchema = new mongoose.Schema({
    id_veterinario: { type: String, required: true, unique: true },
    nombre: String,
    especialidad: String,
    telefono: String,
    consultorio: String
}, { versionKey: false });
const Veterinario = mongoose.model('veterinarios', VeterinarioSchema);

const DiagnosticoSchema = new mongoose.Schema({
    id_Mascota: String,
    diagnostico: String,
    receta_medica: String,
    proxima_cita: String
}, { collection: 'Diagnostico_y_tratamiento', versionKey: false });
const Diagnostico = mongoose.model('Diagnostico_y_tratamiento', DiagnosticoSchema);

const ConsultaSchema = new mongoose.Schema({
    id_mascota: String,
    motivo: String,
    anamnesis: String,
    hallazgos: String
}, { collection: 'Registro_de_consulta', versionKey: false });
const Consulta = mongoose.model('Registro_de_consulta', ConsultaSchema);

// CORRECCIÓN: "peso actual" con espacio causaba problemas. Se renombra a "peso_actual"
// en el schema pero se mantiene compatibilidad con el campo original en Atlas.
const HistorialSchema = new mongoose.Schema({
    id_mascota: String,
    peso_actual: { type: String, alias: 'peso actual' }, // CORRECCIÓN: alias para compatibilidad con campo existente en Atlas
    vacunacion: String,
    dieta: String,
    alergias_conocidas: String
}, { collection: 'Historial_del_paciente', versionKey: false });
const Historial = mongoose.model('Historial_del_paciente', HistorialSchema);


// --- 3. RUTAS CRUD AUTOMÁTICAS ---
const generarRutasCRUD = (ruta, Modelo) => {
    app.get(`/${ruta}`, async (req, res) => {
        try {
            const registros = await Modelo.find().lean(); // lean() mejora rendimiento
            res.json(registros);
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    app.post(`/${ruta}`, async (req, res) => {
        try {
            const nuevoRegistro = new Modelo(req.body);
            await nuevoRegistro.save();
            res.status(201).json({ mensaje: 'Guardado con éxito' });
        } catch (err) { res.status(400).json({ error: err.message }); }
    });

    app.put(`/${ruta}/:id`, async (req, res) => {
        try {
            await Modelo.findByIdAndUpdate(req.params.id, req.body, { new: true });
            res.json({ mensaje: 'Actualizado con éxito' });
        } catch (err) { res.status(400).json({ error: err.message }); }
    });

    app.delete(`/${ruta}/:id`, async (req, res) => {
        try {
            await Modelo.findByIdAndDelete(req.params.id);
            res.json({ mensaje: 'Eliminado con éxito' });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });
};

generarRutasCRUD('clientes', Cliente);
generarRutasCRUD('mascotas', Mascota);
generarRutasCRUD('veterinarios', Veterinario);
generarRutasCRUD('Diagnostico_y_tratamiento', Diagnostico);
generarRutasCRUD('Registro_de_consulta', Consulta);
generarRutasCRUD('Historial_del_paciente', Historial);


// --- 4. RUTA DE DIAGNÓSTICO (NUEVA) ---
// Visita http://localhost:3000/status para verificar si el servidor está conectado
app.get('/status', (req, res) => {
    const estado = mongoose.connection.readyState;
    const estados = { 0: 'desconectado', 1: 'conectado', 2: 'conectando', 3: 'desconectando' };
    res.json({ servidor: 'activo', mongodb: estados[estado] || 'desconocido' });
});


// --- 5. INICIAR EL SERVIDOR ---
app.listen(PUERTO, () => {
    console.log(`====================================================`);
    console.log(` Servidor corriendo en: http://localhost:${PUERTO}`);
    console.log(` Diagnóstico en:        http://localhost:${PUERTO}/status`);
    console.log(`====================================================`);
});
