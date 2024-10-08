// Express.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Endereços URL liberados para o Backend Acessar
const allowedOrigins = [
  'http://localhost:3000'
];

// Middleware CORS atualizado
app.use(cors({
  origin: function (origin, callback) {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Permitir métodos HTTP
  allowedHeaders: ['Content-Type', 'Authorization'], // Permitir cabeçalhos customizados
  credentials: true // Se precisar de cookies ou autenticação via credenciais
}));

// Garantir que OPTIONS requests sejam respondidas corretamente
app.options('*', cors()); 

app.use(express.json());

// Conectar ao MongoDB
  mongoose.connect('SEU_ENDEREÇO_IP_DO_BANCO_DE_DADOS', {
  useNewUrlParser: true,
  useUnifiedTopology: true, // Certifique-se de indicar o banco de autenticação correto (geralmente 'admin')
});

// Função para validar se as respostas são números entre 1 e 10
function validarRespostas(respostas) {
  if (!Array.isArray(respostas)) {
    return false;
  }
  return !respostas.some(resposta => typeof resposta !== 'number' || resposta < 1 || resposta > 10);
}

// Esquema Mongoose
const respostaSchema = new mongoose.Schema({
  grupo: {
    type: String,
    required: true,
  },
  tema1: {
    type: [Number],
    required: true,
    validate: [(val) => val.length === 7, 'O tema 1 deve ter 7 respostas'],
  },
  tema2: {
    type: [Number],
    required: true,
    validate: [(val) => val.length === 7, 'O tema 2 deve ter 7 respostas'],
  },
  tema3: {
    type: [Number],
    required: true,
    validate: [(val) => val.length === 8, 'O tema 3 deve ter 8 respostas'],
  },
  medias: {
    type: [[Number]], // Armazenará a posição mais selecionada para cada pergunta dentro de cada tema
    default: [[], [], []],
  }
});

const Resposta = mongoose.model('Resposta', respostaSchema);

// Função para calcular a posição mais selecionada por pergunta
function calcularPosicaoMaisSelecionada(todasRespostas, tema, numeroDePerguntas) {
  const contagem = Array.from({ length: numeroDePerguntas }, () => ({}));

  todasRespostas.forEach(resposta => {
    resposta[tema].forEach((posicao, index) => {
      if (!contagem[index][posicao]) {
        contagem[index][posicao] = 0;
      }
      contagem[index][posicao]++;
    });
  });

  return contagem.map(pergunta => {
    // Se Object.keys(pergunta) estiver vazio, retornar 0 como valor padrão
    const chaves = Object.keys(pergunta);
    if (chaves.length === 0) return null; // Ou outro valor padrão adequado

    return parseInt(chaves.reduce((a, b) => pergunta[a] > pergunta[b] ? a : b, chaves[0]), 10);
  });
}

// Rota para salvar respostas
app.post('/api/respostas', async (req, res) => {
  const { grupo, tema1, tema2, tema3 } = req.body;

  // Verificações para garantir que os dados estejam no formato correto
  if (!grupo) {
    return res.status(400).json({ message: "O grupo é obrigatório." });
  }
  if (tema1.length !== 7 || tema2.length !== 7 || tema3.length !== 8) {
    return res.status(400).json({ message: "Cada tema deve ter o número correto de respostas." });
  }

  try {
    const todasRespostas = await Resposta.find({});

    const mediasAtualizadasTema1 = calcularPosicaoMaisSelecionada(todasRespostas, 'tema1', 7);
    const mediasAtualizadasTema2 = calcularPosicaoMaisSelecionada(todasRespostas, 'tema2', 7);
    const mediasAtualizadasTema3 = calcularPosicaoMaisSelecionada(todasRespostas, 'tema3', 8);

    const novaResposta = new Resposta({
      grupo,
      tema1,
      tema2,
      tema3,
      medias: [mediasAtualizadasTema1, mediasAtualizadasTema2, mediasAtualizadasTema3],
    });
    await novaResposta.save();

    res.status(201).send('Respostas salvas com sucesso!');
  } catch (error) {
    // Adiciona um log detalhado do erro
    console.error('Erro ao salvar respostas:', error);
    res.status(500).send('Erro ao salvar respostas');
  }
});


// Rota para calcular a média das respostas
app.get('/api/medias', async (req, res) => {
  try {
    const ultimaResposta = await Resposta.findOne({}, {}, { sort: { '_id': -1 } });
    if (!ultimaResposta || !ultimaResposta.medias.length) {
      return res.status(404).json({ message: "Nenhuma média encontrada." });
    }
    res.json({ medias: ultimaResposta.medias });
  } catch (error) {
    res.status(500).send('Erro ao buscar as médias');
  }
});

// Iniciar o servidor na porta 5051
const PORT = process.env.PORT || 5051;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
