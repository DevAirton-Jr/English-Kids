// CONSTANTES E ESTADO INICIAL
const STORAGE = 'duokids_final_v1'; // Chave para armazenamento local

// Estado global da aplicação
let state = {
  user: null,     // Dados do usuário logado
  xp: 0,          // Pontos de experiência
  stars: 0,       // Estrelas conquistadas
  progress: {},    // Progresso nas lições (lessonId: stars)
  mission: 0,      // Progresso na missão diária
  classes: [],     // Turmas (apenas para professores)
  gameProgress: {} // Progresso nos jogos (gameId_levelId: completed)
};

/* ========== CONFIGURAÇÃO DO FIREBASE ========== */
// NOTA: Substitua estas configurações pelas suas próprias do console do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB1Gue959P7oREZ-2hKJ-TA4ZIL8nyNuhY",
  authDomain: "english-kids-2bf13.firebaseapp.com",
  projectId: "english-kids-2bf13",
  storageBucket: "english-kids-2bf13.firebasestorage.app",
  messagingSenderId: "171741935379",
  appId: "SEU_APP_ID"
};

// Inicializa o Firebase
let firebaseInitialized = false;
let auth = null;
let db = null;

function initFirebase() {
  try {
    // Inicializa o Firebase apenas uma vez
    if (!firebaseInitialized) {
      firebase.initializeApp(firebaseConfig);
      auth = firebase.auth();
      db = firebase.firestore();
      firebaseInitialized = true;
      console.log('Firebase inicializado com sucesso');
    }
  } catch (error) {
    console.error('Erro ao inicializar Firebase:', error);
    alert('Erro ao conectar com o Firebase. Usando modo offline.');
  }
}

// LISTA COMPLETA DE LIÇÕES (mantida integralmente)
const LESSONS = [
  {
    id: 'l1', title: 'Greetings', level: 'Iniciante',
    vocab: [{en:'Hello',pt:'Olá'}, {en:'Good morning',pt:'Bom dia'}, {en:'Bye',pt:'Tchau'}],
    content: 'Nesta lição você aprende formas básicas de cumprimento. Pratique dizendo as palavras e reconhecendo suas traduções.',
    exercises: [
      {type:'mcq', q:'Qual a tradução de "Hello"?', options:['Tchau','Olá','Bom dia'], answer:'Olá'},
      {type:'fill', q:'Complete: Good ____', answer:'morning'}
    ]
  },
  { id:'l2', title:'Colors', level:'Iniciante', vocab:[{en:'Red',pt:'Vermelho'},{en:'Blue',pt:'Azul'},{en:'Green',pt:'Verde'}], content:'Cores básicas em inglês.', exercises:[{type:'mcq', q:'Qual a tradução de "Red"?', options:['Azul','Vermelho','Verde'], answer:'Vermelho'},{type:'fill', q:'Complete: The sky is ____', answer:'blue'}] },
  { id:'l3', title:'Animals', level:'Iniciante', vocab:[{en:'Cat',pt:'Gato'},{en:'Dog',pt:'Cachorro'},{en:'Bird',pt:'Pássaro'}], content:'Animais comuns.', exercises:[{type:'mcq', q:'Qual a tradução de "Dog"?', options:['Gato','Cachorro','Pássaro'], answer:'Cachorro'},{type:'match', q:'Combine: Cat, Dog', pairs:[['Cat','Gato'], ['Dog','Cachorro']]}] },
  { id:'l4', title:'Food', level:'Iniciante', vocab:[{en:'Apple',pt:'Maçã'},{en:'Banana',pt:'Banana'},{en:'Milk',pt:'Leite'}], content:'Palavras de comida.', exercises:[{type:'mcq', q:'Qual a tradução de "Apple"?', options:['Banana','Maçã','Leite'], answer:'Maçã'},{type:'fill', q:'Complete: I like ____', answer:'apple'}] },
  { id:'l5', title:'Family', level:'Iniciante', vocab:[{en:'Mother',pt:'Mãe'},{en:'Father',pt:'Pai'},{en:'Brother',pt:'Irmão'}], content:'Palavras de família.', exercises:[{type:'mcq', q:'Qual a tradução de "Mother"?', options:['Pai','Mãe','Irmão'], answer:'Mãe'},{type:'match', q:'Combine: Mother, Father', pairs:[['Mother','Mãe'], ['Father','Pai']]}] }
];

// LISTA DE JOGOS EDUCATIVOS
// NOTA: Imagens necessárias para os jogos:
// - Ícones para cada jogo (memory, wordquiz, wordorder) em assets/icons/
// - Imagens para os cards do jogo da memória (animais, cores, números) em assets/icons/
// - Imagens para as opções do quiz de palavras
// - Imagens decorativas para as telas de comemoração
const GAMES = [
  {
    id: 'memory',
    title: 'Jogo da Memória',
    description: 'Encontre os pares de palavras em inglês e português',
    icon: '🎮',
    levels: [
      {
        id: 'level1',
        title: 'Nível 1 - Animais',
        description: 'Encontre os pares de animais',
        pairs: [
          {en: 'Cat', pt: 'Gato'},
          {en: 'Dog', pt: 'Cachorro'},
          {en: 'Bird', pt: 'Pássaro'},
          {en: 'Fish', pt: 'Peixe'}
        ]
      },
      {
        id: 'level2',
        title: 'Nível 2 - Comidas',
        description: 'Encontre os pares de comidas',
        pairs: [
          {en: 'Apple', pt: 'Maçã'},
          {en: 'Banana', pt: 'Banana'},
          {en: 'Orange', pt: 'Laranja'},
          {en: 'Milk', pt: 'Leite'},
          {en: 'Bread', pt: 'Pão'},
          {en: 'Water', pt: 'Água'}
        ]
      },
      {
        id: 'level3',
        title: 'Nível 3 - Cores e Números',
        description: 'Encontre os pares de cores e números',
        pairs: [
          {en: 'Red', pt: 'Vermelho'},
          {en: 'Blue', pt: 'Azul'},
          {en: 'Green', pt: 'Verde'},
          {en: 'Yellow', pt: 'Amarelo'},
          {en: 'One', pt: 'Um'},
          {en: 'Two', pt: 'Dois'},
          {en: 'Three', pt: 'Três'},
          {en: 'Four', pt: 'Quatro'}
        ]
      }
    ]
  },
  {
    id: 'wordquiz',
    title: 'Quiz de Palavras',
    description: 'Escolha a tradução correta para cada palavra',
    icon: '❓',
    levels: [
      {
        id: 'level1',
        title: 'Nível 1 - Básico',
        description: 'Palavras básicas em inglês',
        questions: [
          {word: 'Hello', options: ['Olá', 'Tchau', 'Bom dia'], answer: 'Olá'},
          {word: 'Dog', options: ['Gato', 'Cachorro', 'Pássaro'], answer: 'Cachorro'},
          {word: 'Red', options: ['Azul', 'Verde', 'Vermelho'], answer: 'Vermelho'},
          {word: 'Apple', options: ['Maçã', 'Banana', 'Laranja'], answer: 'Maçã'},
          {word: 'Mother', options: ['Pai', 'Mãe', 'Irmão'], answer: 'Mãe'}
        ]
      },
      {
        id: 'level2',
        title: 'Nível 2 - Intermediário',
        description: 'Palavras de nível intermediário',
        questions: [
          {word: 'School', options: ['Escola', 'Casa', 'Parque'], answer: 'Escola'},
          {word: 'Book', options: ['Livro', 'Caderno', 'Lápis'], answer: 'Livro'},
          {word: 'Friend', options: ['Família', 'Amigo', 'Professor'], answer: 'Amigo'},
          {word: 'House', options: ['Apartamento', 'Casa', 'Prédio'], answer: 'Casa'},
          {word: 'Play', options: ['Trabalhar', 'Estudar', 'Brincar'], answer: 'Brincar'},
          {word: 'Teacher', options: ['Aluno', 'Professor', 'Diretor'], answer: 'Professor'}
        ]
      },
      {
        id: 'level3',
        title: 'Nível 3 - Avançado',
        description: 'Palavras mais complexas',
        questions: [
          {word: 'Beautiful', options: ['Feio', 'Bonito', 'Grande'], answer: 'Bonito'},
          {word: 'Happy', options: ['Triste', 'Feliz', 'Cansado'], answer: 'Feliz'},
          {word: 'Difficult', options: ['Fácil', 'Difícil', 'Simples'], answer: 'Difícil'},
          {word: 'Breakfast', options: ['Almoço', 'Jantar', 'Café da manhã'], answer: 'Café da manhã'},
          {word: 'Playground', options: ['Parquinho', 'Escola', 'Biblioteca'], answer: 'Parquinho'},
          {word: 'Homework', options: ['Trabalho', 'Lição de casa', 'Projeto'], answer: 'Lição de casa'},
          {word: 'Birthday', options: ['Aniversário', 'Feriado', 'Festa'], answer: 'Aniversário'}
        ]
      }
    ]
  },
  {
    id: 'wordorder',
    title: 'Ordem das Palavras',
    description: 'Coloque as palavras na ordem correta para formar frases',
    icon: '📝',
    levels: [
      {
        id: 'level1',
        title: 'Nível 1 - Frases Simples',
        description: 'Organize frases simples',
        sentences: [
          {words: ['I', 'like', 'apples'], translation: 'Eu gosto de maçãs'},
          {words: ['The', 'cat', 'is', 'black'], translation: 'O gato é preto'},
          {words: ['My', 'name', 'is', 'John'], translation: 'Meu nome é John'},
          {words: ['I', 'have', 'a', 'dog'], translation: 'Eu tenho um cachorro'}
        ]
      },
      {
        id: 'level2',
        title: 'Nível 2 - Frases Médias',
        description: 'Organize frases de tamanho médio',
        sentences: [
          {words: ['I', 'go', 'to', 'school', 'every', 'day'], translation: 'Eu vou para a escola todos os dias'},
          {words: ['She', 'likes', 'to', 'play', 'with', 'friends'], translation: 'Ela gosta de brincar com amigos'},
          {words: ['The', 'book', 'is', 'on', 'the', 'table'], translation: 'O livro está sobre a mesa'},
          {words: ['My', 'favorite', 'color', 'is', 'blue'], translation: 'Minha cor favorita é azul'}
        ]
      },
      {
        id: 'level3',
        title: 'Nível 3 - Frases Complexas',
        description: 'Organize frases mais complexas',
        sentences: [
          {words: ['I', 'want', 'to', 'learn', 'English', 'because', 'it', 'is', 'fun'], translation: 'Eu quero aprender inglês porque é divertido'},
          {words: ['My', 'teacher', 'helps', 'me', 'with', 'my', 'homework', 'every', 'day'], translation: 'Meu professor me ajuda com minha lição de casa todos os dias'},
          {words: ['We', 'are', 'going', 'to', 'the', 'park', 'on', 'Saturday'], translation: 'Nós vamos ao parque no sábado'},
          {words: ['The', 'little', 'girl', 'has', 'a', 'beautiful', 'red', 'dress'], translation: 'A garotinha tem um lindo vestido vermelho'}
        ]
      }
    ]
  }
];

// UTILITÁRIOS (mantidos exatamente como estavam)
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

// Toca efeitos sonoros
function playSound(name){ 
  const map = {
    click:'assets/sounds/click.wav', 
    win:'assets/sounds/win.wav', 
    wrong:'assets/sounds/wrong.wav'
  }; 
  const a = new Audio(map[name]||map.click); 
  a.volume = 0.8; 
  try{ a.play(); }catch(e){} 
}

// PERSISTÊNCIA DO ESTADO (original)
function loadState(){ 
  try{ 
    const raw = localStorage.getItem(STORAGE); 
    if(raw) state = JSON.parse(raw); 
  }catch(e){ console.warn(e);} 
}

function saveState(){ 
  localStorage.setItem(STORAGE, JSON.stringify(state)); 
}

// INICIALIZAÇÃO DA APLICAÇÃO (original, apenas com comentários)
function init(){
  // Configura abas de login/cadastro
  $('#tabSignIn').addEventListener('click', ()=>{ 
    $('#tabSignIn').classList.add('active'); 
    $('#tabSignUp').classList.remove('active'); 
    $('#signinForm').style.display='block'; 
    $('#signupForm').style.display='none'; 
  });
  
  $('#tabSignUp').addEventListener('click', ()=>{ 
    $('#tabSignUp').classList.add('active'); 
    $('#tabSignIn').classList.remove('active'); 
    $('#signupForm').style.display='block'; 
    $('#signinForm').style.display='none'; 
  });

  // Inicializa o Firebase quando a página carrega
  initFirebase();

  // Cadastro de novo usuário com Firebase
  $('#btnSignUp').addEventListener('click', (e)=>{
    e.preventDefault();
    const name = $('#signupName').value.trim();
    const email = $('#signupEmail').value.trim();
    const password = $('#signupPassword').value;
    const dob = $('#signupDob').value;
    const role = $('#signupRole').value;
    const photoInput = $('#signupPhoto');
    
    if(!name){ alert('Digite um nome'); return; }
    if(!email){ alert('Digite um email'); return; }
    if(!password || password.length < 6){ alert('A senha deve ter pelo menos 6 caracteres'); return; }
    
    // Função para processar o cadastro após o upload da foto
    const processSignup = (photoUrl = null) => {
      // Tenta criar usuário no Firebase
      if (firebaseInitialized) {
        // Mostra indicador de carregamento
        $('#btnSignUp').disabled = true;
        $('#btnSignUp').textContent = 'Cadastrando...';
        
        auth.createUserWithEmailAndPassword(email, password)
          .then((userCredential) => {
            // Usuário criado com sucesso
            const firebaseUser = userCredential.user;
            
            // Salva dados adicionais no Firestore
            return db.collection('users').doc(firebaseUser.uid).set({
              name: name,
              email: email,
              dob: dob,
              role: role,
              photo: photoUrl,
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
          })
          .then(() => {
            // Atualiza estado local
            const user = { name, email, dob, role, photo: photoUrl, uid: auth.currentUser.uid };
            state = { ...state, user, xp:0, stars:0, progress:{}, mission:0 };
            saveState();
            showApp();
          })
          .catch((error) => {
            console.error('Erro no cadastro:', error);
            alert(`Erro no cadastro: ${error.message}`);
          })
          .finally(() => {
            // Restaura botão
            $('#btnSignUp').disabled = false;
            $('#btnSignUp').textContent = 'Cadastrar';
          });
      } else {
        // Modo offline (fallback)
        const user = { name, email, dob, role, photo: photoUrl };
        state = { ...state, user, xp:0, stars:0, progress:{}, mission:0 };
        saveState();
        showApp();
      }
    };
    
    // Processa a foto se existir
    if(photoInput.files && photoInput.files[0]){
      const f = photoInput.files[0];
      const r = new FileReader();
      r.onload = function(ev){
        // No modo Firebase completo, aqui faria upload para o Firebase Storage
        // Por enquanto, apenas armazena localmente
        processSignup(ev.target.result);
      }
      r.readAsDataURL(f);
    } else {
      processSignup();
    }
  });

  // Login com Firebase
  $('#btnSignIn').addEventListener('click', (e)=>{
    e.preventDefault();
    const email = $('#signinEmail').value.trim();
    const password = $('#signinPassword').value;
    
    if(!email){ alert('Digite seu email'); return; }
    if(!password){ alert('Digite sua senha'); return; }
    
    if (firebaseInitialized) {
      // Mostra indicador de carregamento
      $('#btnSignIn').disabled = true;
      $('#btnSignIn').textContent = 'Entrando...';
      
      auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
          // Login bem-sucedido
          const firebaseUser = userCredential.user;
          
          // Busca dados adicionais do Firestore
          return db.collection('users').doc(firebaseUser.uid).get();
        })
        .then((doc) => {
          if (doc.exists) {
            const userData = doc.data();
            
            // Carrega dados do usuário
            const user = {
              name: userData.name,
              email: userData.email,
              dob: userData.dob,
              role: userData.role,
              photo: userData.photo,
              uid: auth.currentUser.uid
            };
            
            // Tenta carregar progresso existente
            const raw = localStorage.getItem(STORAGE);
            if(raw){
              try{
                const s = JSON.parse(raw);
                if(s.user && s.user.email === email){
                  state = s;
                  state.user = user; // Atualiza dados do usuário
                  saveState();
                  showApp();
                  return;
                }
              } catch(e){}
            }
            
            // Cria novo estado
            state = { ...state, user, xp:0, stars:0, progress:{}, mission:0 };
            saveState();
            showApp();
          } else {
            console.error('Documento do usuário não encontrado');
            alert('Erro ao carregar dados do usuário');
          }
        })
        .catch((error) => {
          console.error('Erro no login:', error);
          alert(`Erro no login: ${error.message}`);
        })
        .finally(() => {
          // Restaura botão
          $('#btnSignIn').disabled = false;
          $('#btnSignIn').textContent = 'Entrar';
        });
    } else {
      // Modo offline (fallback)
      // Tenta carregar usuário existente
      const raw = localStorage.getItem(STORAGE);
      if(raw){
        try{
          const s = JSON.parse(raw);
          if(s.user && s.user.email === email){
            state = s;
            showApp();
            return;
          }
        } catch(e){}
      }
      
      alert('Usuário não encontrado ou Firebase não inicializado');
    }
  });

  // Configura navegação principal
  $$('.navbtn').forEach(btn => btn.addEventListener('click', (e)=>{ 
    const v = e.currentTarget.dataset.view; 
    switchView(v); 
    playSound('click'); 
  }));

  // Botões de ação rápida
  $('#gotoLessons').addEventListener('click', ()=>{ switchView('lessons'); playSound('click'); });
  $('#gotoGames').addEventListener('click', ()=>{ switchView('games'); playSound('click'); });
  $('#logoutBtn').addEventListener('click', ()=>{ 
    if(confirm('Sair da conta?')){ 
      // Logout do Firebase
      if (firebaseInitialized && auth) {
        auth.signOut().then(() => {
          localStorage.removeItem(STORAGE);
          location.reload();
        }).catch((error) => {
          console.error('Erro ao fazer logout:', error);
          localStorage.removeItem(STORAGE);
          location.reload();
        });
      } else {
        localStorage.removeItem(STORAGE);
        location.reload();
      }
    } 
  });

  // Gerenciamento de perfil
  $('#saveProfile').addEventListener('click', (e)=>{
    e.preventDefault();
    const name = $('#profileName').value.trim();
    const dob = $('#profileDob').value;
    const hobbies = $('#profileHobbies').value.trim();
    const bio = $('#profileBio').value.trim();
    const photoInput = $('#profilePhoto');
    
    if(photoInput.files && photoInput.files[0]){
      const r = new FileReader();
      r.onload = function(ev){ 
        state.user.photo = ev.target.result; 
        finishProfileSave(name, dob, hobbies, bio); 
      }
      r.readAsDataURL(photoInput.files[0]);
    } else {
      finishProfileSave(name, dob, hobbies, bio);
    }
  });
  
  // Reset de progresso
  $('#resetProgress').addEventListener('click', ()=>{ 
    if(confirm('Resetar progresso?')){ 
      state.xp = 0; 
      state.stars = 0; 
      state.progress = {}; 
      saveState(); 
      renderApp(); 
      alert('Progresso resetado'); 
    } 
  });

  // Controles de turmas (professor)
  $('#createClassBtn').addEventListener('click', (e)=>{
    e.preventDefault();
    createClass();
  });

  // Carrega estado inicial e verifica autenticação do Firebase
  loadState();
  
  // Verifica se o usuário já está logado no Firebase
  if (firebaseInitialized && auth) {
    auth.onAuthStateChanged((user) => {
      if (user) {
        // Usuário já está logado no Firebase
        if (state && state.user && state.user.uid === user.uid) {
          // Estado local já está sincronizado
          showApp();
        } else {
          // Busca dados do usuário no Firestore
          db.collection('users').doc(user.uid).get()
            .then((doc) => {
              if (doc.exists) {
                const userData = doc.data();
                state.user = {
                  name: userData.name,
                  email: userData.email,
                  dob: userData.dob,
                  role: userData.role,
                  photo: userData.photo,
                  uid: user.uid
                };
                saveState();
                showApp();
              } else {
                // Documento não encontrado, faz logout
                auth.signOut();
                $('#loginView').style.display = 'block';
              }
            })
            .catch((error) => {
              console.error('Erro ao buscar dados do usuário:', error);
              $('#loginView').style.display = 'block';
            });
        }
      } else {
        // Usuário não está logado no Firebase
        if (state && state.user && state.user.name) {
          // Tem estado local, mas não está logado no Firebase
          // Modo offline ou fallback
          showApp();
        } else {
          $('#loginView').style.display = 'block';
        }
      }
    });
  } else {
    // Firebase não inicializado, usa modo offline
    if (state && state.user && state.user.name) {
      showApp();
    } else {
      $('#loginView').style.display = 'block';
    }
  }
}

/* ========== FUNÇÕES DA APLICAÇÃO ========== */

// Mostra a aplicação principal após login
function showApp(){
  $('#loginView').style.display='none';
  $('#app').style.display='block';
  renderApp();
  switchView('home');
}

// NOTA: Imagens necessárias para o emoji do herói (hero-emoji) em assets/hero/
// Atualiza toda a UI da aplicação
function renderApp(){
  // Mostra/oculta navegação para professores
  if(state.user && state.user.role === 'teacher'){
    $('#navClasses').style.display = 'inline-flex';
  } else {
    $('#navClasses').style.display = 'none';
  }

  // Atualiza dados do usuário
  if(state.user){
    $('#userName').textContent = state.user.name || 'Aluno';
    $('#userRole').textContent = state.user.role === 'teacher' ? 'Professor' : 'Aluno';
    $('#xpCount').textContent = state.xp || 0;
    $('#starsCount').textContent = '🌟 ' + (state.stars || 0);
    
    // Configura avatar (imagem ou ícone)
    $('#profileAvatar').textContent = state.user.photo ? '' : (state.user.name ? state.user.name.charAt(0).toUpperCase() : '👦');
    if(state.user.photo){
      $('#profileAvatar').style.backgroundImage = `url(${state.user.photo})`;
      $('#profileAvatar').style.backgroundSize = 'cover';
      $('#profileAvatar').textContent = '';
    } else {
      $('#profileAvatar').style.backgroundImage = '';
    }
  }
  
  // Renderiza seções dinâmicas
  renderLessonList();
  renderRecentLessons();
  renderGamesList();
  renderProfilePreview();
  renderClassesList();
  saveState();
}

// Renderiza a lista de jogos disponíveis
// NOTA: Imagens necessárias para os cards de jogos em assets/icons/
function renderGamesList() {
  const el = $('#gamesList');
  el.innerHTML = '';
  
  GAMES.forEach(game => {
    const div = document.createElement('div');
    div.className = 'game-card card';
    div.innerHTML = `
      <div class="game-icon">${game.icon}</div>
      <h3>${game.title}</h3>
      <p class="small muted">${game.description}</p>
      <div class="row" style="margin-top:8px">
        <button class="btn openGame" data-id="${game.id}">Jogar</button>
      </div>
    `;
    el.appendChild(div);
  });
  
  // Adiciona listeners aos botões
  $$('.openGame').forEach(b => b.addEventListener('click', e => openGame(e.target.dataset.id)));
}

// Abre um jogo específico
function openGame(gameId) {
  const game = GAMES.find(g => g.id === gameId);
  if (!game) return;
  
  const gameArea = $('#gameArea');
  gameArea.innerHTML = '';
  
  // Cria o cabeçalho do jogo
  const header = document.createElement('div');
  header.className = 'card';
  header.innerHTML = `
    <h3>${game.title}</h3>
    <p>${game.description}</p>
    <div id="gameLevels" class="levels-grid"></div>
  `;
  gameArea.appendChild(header);
  
  // Renderiza os níveis do jogo
  const levelsGrid = header.querySelector('#gameLevels');
  game.levels.forEach(level => {
    // Verifica se o nível foi completado
    const isCompleted = state.gameProgress[`${gameId}_${level.id}`];
    
    const levelCard = document.createElement('div');
    levelCard.className = 'level-card card small';
    levelCard.innerHTML = `
      <h4>${level.title} ${isCompleted ? '✅' : ''}</h4>
      <p class="small muted">${level.description}</p>
      <button class="btn ${isCompleted ? 'secondary' : ''}" data-game="${gameId}" data-level="${level.id}">
        ${isCompleted ? 'Jogar novamente' : 'Iniciar'}
      </button>
    `;
    levelsGrid.appendChild(levelCard);
    
    // Adiciona listener ao botão
    levelCard.querySelector('button').addEventListener('click', () => {
      startGameLevel(gameId, level.id);
    });
  });
  
  // Rola para o conteúdo do jogo
  gameArea.scrollIntoView({behavior: 'smooth'});
  playSound('click');
}

// Inicia um nível específico de um jogo
function startGameLevel(gameId, levelId) {
  const game = GAMES.find(g => g.id === gameId);
  if (!game) return;
  
  const level = game.levels.find(l => l.id === levelId);
  if (!level) return;
  
  const gameArea = $('#gameArea');
  
  // Limpa a área de jogo
  gameArea.innerHTML = '';
  
  // Cria o cabeçalho do nível
  const header = document.createElement('div');
  header.className = 'card';
  header.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center">
      <h3>${level.title}</h3>
      <button id="backToGameBtn" class="btn secondary">Voltar</button>
    </div>
    <p class="muted">${level.description}</p>
    <div id="gameContent" class="game-content"></div>
  `;
  gameArea.appendChild(header);
  
  // Adiciona listener ao botão de voltar
  header.querySelector('#backToGameBtn').addEventListener('click', () => {
    openGame(gameId);
  });
  
  // Renderiza o conteúdo do jogo de acordo com o tipo
  const gameContent = header.querySelector('#gameContent');
  
  if (gameId === 'memory') {
    renderMemoryGame(gameContent, game, level);
  } else if (gameId === 'wordquiz') {
    renderWordQuiz(gameContent, game, level);
  } else if (gameId === 'wordorder') {
    renderWordOrder(gameContent, game, level);
  }
}

// Renderiza o jogo da memória
function renderMemoryGame(container, game, level) {
  // Cria o tabuleiro do jogo
  const board = document.createElement('div');
  board.className = 'memory-board';
  container.appendChild(board);
  
  // Prepara os pares de cartas
  let cards = [];
  level.pairs.forEach(pair => {
    cards.push({ text: pair.en, type: 'en', match: pair.pt });
    cards.push({ text: pair.pt, type: 'pt', match: pair.en });
  });
  
  // Embaralha as cartas
  cards = shuffleArray(cards);
  
  // Cria as cartas no tabuleiro
  cards.forEach((card, index) => {
    const cardElement = document.createElement('div');
    cardElement.className = 'memory-card';
    cardElement.dataset.index = index;
    cardElement.dataset.text = card.text;
    cardElement.dataset.type = card.type;
    cardElement.dataset.match = card.match;
    cardElement.innerHTML = `
      <div class="card-front">?</div>
      <div class="card-back">${card.text}</div>
    `;
    board.appendChild(cardElement);
  });
  
  // Variáveis para controle do jogo
  let flippedCards = [];
  let matchedPairs = 0;
  let canFlip = true;
  
  // Adiciona listener às cartas
  board.querySelectorAll('.memory-card').forEach(card => {
    card.addEventListener('click', () => {
      // Verifica se a carta já foi virada ou se já tem duas cartas viradas
      if (!canFlip || card.classList.contains('flipped') || card.classList.contains('matched')) {
        return;
      }
      
      // Vira a carta
      card.classList.add('flipped');
      flippedCards.push(card);
      playSound('click');
      
      // Verifica se há duas cartas viradas
      if (flippedCards.length === 2) {
        canFlip = false;
        
        const card1 = flippedCards[0];
        const card2 = flippedCards[1];
        
        // Verifica se as cartas formam um par
        if (
          (card1.dataset.type === 'en' && card2.dataset.type === 'pt' && card1.dataset.text === card2.dataset.match) ||
          (card1.dataset.type === 'pt' && card2.dataset.type === 'en' && card1.dataset.text === card2.dataset.match)
        ) {
          // Par encontrado
          setTimeout(() => {
            card1.classList.add('matched');
            card2.classList.add('matched');
            flippedCards = [];
            canFlip = true;
            matchedPairs++;
            playSound('win');
            
            // Verifica se o jogo acabou
            if (matchedPairs === level.pairs.length) {
              completeGameLevel(game.id, level.id);
            }
          }, 500);
        } else {
          // Par incorreto
          setTimeout(() => {
            card1.classList.remove('flipped');
            card2.classList.remove('flipped');
            flippedCards = [];
            canFlip = true;
            playSound('wrong');
          }, 1000);
        }
      }
    });
  });
  
  // Adiciona instruções
  const instructions = document.createElement('div');
  instructions.className = 'instructions';
  instructions.innerHTML = `
    <p class="muted">Clique nas cartas para virá-las e encontre os pares de palavras em inglês e português.</p>
  `;
  container.appendChild(instructions);
}

// Renderiza o quiz de palavras
function renderWordQuiz(container, game, level) {
  // Embaralha as perguntas
  const questions = shuffleArray([...level.questions]);
  let currentQuestion = 0;
  let correctAnswers = 0;
  
  // Cria o container de perguntas
  const quizContainer = document.createElement('div');
  quizContainer.className = 'quiz-container';
  container.appendChild(quizContainer);
  
  // Função para mostrar a próxima pergunta
  function showQuestion() {
    if (currentQuestion >= questions.length) {
      // Jogo finalizado
      quizContainer.innerHTML = `
        <div class="quiz-result">
          <h3>Resultado</h3>
          <p>Você acertou ${correctAnswers} de ${questions.length} perguntas!</p>
          ${correctAnswers >= Math.ceil(questions.length * 0.7) ? 
            `<p>Parabéns! Você completou o nível!</p>
             <button id="finishQuizBtn" class="btn">Concluir</button>` : 
            `<p>Tente novamente para completar o nível.</p>
             <button id="retryQuizBtn" class="btn">Tentar novamente</button>`
          }
        </div>
      `;
      
      if (correctAnswers >= Math.ceil(questions.length * 0.7)) {
        quizContainer.querySelector('#finishQuizBtn').addEventListener('click', () => {
          completeGameLevel(game.id, level.id);
        });
      } else {
        quizContainer.querySelector('#retryQuizBtn').addEventListener('click', () => {
          renderWordQuiz(container, game, level);
        });
      }
      
      return;
    }
    
    const question = questions[currentQuestion];
    const options = shuffleArray([...question.options]);
    
    quizContainer.innerHTML = `
      <div class="quiz-question">
        <h3>Qual é a tradução de "${question.word}"?</h3>
        <div class="quiz-options"></div>
        <div class="quiz-progress">Pergunta ${currentQuestion + 1} de ${questions.length}</div>
      </div>
    `;
    
    const optionsContainer = quizContainer.querySelector('.quiz-options');
    options.forEach(option => {
      const button = document.createElement('button');
      button.className = 'btn secondary option-btn';
      button.textContent = option;
      button.addEventListener('click', () => {
        // Desabilita todos os botões
        optionsContainer.querySelectorAll('button').forEach(btn => {
          btn.disabled = true;
        });
        
        if (option === question.answer) {
          // Resposta correta
          button.classList.add('correct');
          correctAnswers++;
          playSound('win');
        } else {
          // Resposta incorreta
          button.classList.add('incorrect');
          // Destaca a resposta correta
          optionsContainer.querySelectorAll('button').forEach(btn => {
            if (btn.textContent === question.answer) {
              btn.classList.add('correct');
            }
          });
          playSound('wrong');
        }
        
        // Avança para a próxima pergunta após um breve intervalo
        setTimeout(() => {
          currentQuestion++;
          showQuestion();
        }, 1500);
      });
      optionsContainer.appendChild(button);
    });
  }
  
  // Inicia o quiz
  showQuestion();
}

// Renderiza o jogo de ordem das palavras
function renderWordOrder(container, game, level) {
  // Embaralha as frases
  const sentences = shuffleArray([...level.sentences]);
  let currentSentence = 0;
  let correctSentences = 0;
  
  // Cria o container do jogo
  const gameContainer = document.createElement('div');
  gameContainer.className = 'wordorder-container';
  container.appendChild(gameContainer);
  
  // Função para mostrar a próxima frase
  function showSentence() {
    if (currentSentence >= sentences.length) {
      // Jogo finalizado
      gameContainer.innerHTML = `
        <div class="wordorder-result">
          <h3>Resultado</h3>
          <p>Você acertou ${correctSentences} de ${sentences.length} frases!</p>
          ${correctSentences >= Math.ceil(sentences.length * 0.7) ? 
            `<p>Parabéns! Você completou o nível!</p>
             <button id="finishGameBtn" class="btn">Concluir</button>` : 
            `<p>Tente novamente para completar o nível.</p>
             <button id="retryGameBtn" class="btn">Tentar novamente</button>`
          }
        </div>
      `;
      
      if (correctSentences >= Math.ceil(sentences.length * 0.7)) {
        gameContainer.querySelector('#finishGameBtn').addEventListener('click', () => {
          completeGameLevel(game.id, level.id);
        });
      } else {
        gameContainer.querySelector('#retryGameBtn').addEventListener('click', () => {
          renderWordOrder(container, game, level);
        });
      }
      
      return;
    }
    
    const sentence = sentences[currentSentence];
    const words = shuffleArray([...sentence.words]);
    
    gameContainer.innerHTML = `
      <div class="wordorder-sentence">
        <h3>Organize as palavras para formar uma frase:</h3>
        <p class="muted">Tradução: "${sentence.translation}"</p>
        <div class="wordorder-words"></div>
        <div class="wordorder-answer"></div>
        <div class="wordorder-buttons">
          <button id="checkSentenceBtn" class="btn" disabled>Verificar</button>
          <button id="clearSentenceBtn" class="btn secondary">Limpar</button>
        </div>
        <div class="wordorder-progress">Frase ${currentSentence + 1} de ${sentences.length}</div>
      </div>
    `;
    
    const wordsContainer = gameContainer.querySelector('.wordorder-words');
    const answerContainer = gameContainer.querySelector('.wordorder-answer');
    const checkButton = gameContainer.querySelector('#checkSentenceBtn');
    const clearButton = gameContainer.querySelector('#clearSentenceBtn');
    
    // Adiciona as palavras embaralhadas
    words.forEach(word => {
      const wordElement = document.createElement('div');
      wordElement.className = 'word-item';
      wordElement.textContent = word;
      wordElement.dataset.word = word;
      wordElement.addEventListener('click', () => {
        // Move a palavra para a área de resposta
        if (wordElement.parentElement === wordsContainer) {
          answerContainer.appendChild(wordElement);
        } else {
          wordsContainer.appendChild(wordElement);
        }
        
        // Habilita o botão de verificar se houver palavras na área de resposta
        checkButton.disabled = answerContainer.children.length === 0;
      });
      wordsContainer.appendChild(wordElement);
    });
    
    // Botão para limpar a resposta
    clearButton.addEventListener('click', () => {
      // Move todas as palavras de volta para a área de palavras
      while (answerContainer.firstChild) {
        wordsContainer.appendChild(answerContainer.firstChild);
      }
      checkButton.disabled = true;
    });
    
    // Botão para verificar a resposta
    checkButton.addEventListener('click', () => {
      // Obtém a resposta do usuário
      const userAnswer = Array.from(answerContainer.children).map(el => el.dataset.word);
      
      // Verifica se a resposta está correta
      const isCorrect = arraysEqual(userAnswer, sentence.words);
      
      if (isCorrect) {
        // Resposta correta
        answerContainer.classList.add('correct');
        correctSentences++;
        playSound('win');
      } else {
        // Resposta incorreta
        answerContainer.classList.add('incorrect');
        playSound('wrong');
      }
      
      // Desabilita os botões e as palavras
      checkButton.disabled = true;
      clearButton.disabled = true;
      wordsContainer.querySelectorAll('.word-item').forEach(item => {
        item.style.pointerEvents = 'none';
      });
      answerContainer.querySelectorAll('.word-item').forEach(item => {
        item.style.pointerEvents = 'none';
      });
      
      // Mostra a resposta correta se estiver errada
      if (!isCorrect) {
        const correctAnswer = document.createElement('div');
        correctAnswer.className = 'correct-answer';
        correctAnswer.innerHTML = `
          <p>Resposta correta:</p>
          <div class="correct-sentence">${sentence.words.join(' ')}</div>
        `;
        gameContainer.querySelector('.wordorder-sentence').appendChild(correctAnswer);
      }
      
      // Adiciona botão para continuar
      const continueButton = document.createElement('button');
      continueButton.className = 'btn';
      continueButton.textContent = 'Continuar';
      continueButton.addEventListener('click', () => {
        currentSentence++;
        showSentence();
      });
      gameContainer.querySelector('.wordorder-buttons').appendChild(continueButton);
    });
  }
  
  // Inicia o jogo
  showSentence();
}

// Marca um nível de jogo como completo
function completeGameLevel(gameId, levelId) {
  // Marca o nível como completo
  state.gameProgress[`${gameId}_${levelId}`] = true;
  
  // Adiciona XP e estrelas
  state.xp += 15;
  state.stars += 1;
  state.mission += 1;
  
  // Salva o estado
  saveState();
  renderApp();
  
  // Comemoração ao completar o nível
  const game = GAMES.find(g => g.id === gameId);
  const level = game.levels.find(l => l.id === levelId);
  
  const celebration = document.createElement('div');
  celebration.className = 'celebration';
  celebration.innerHTML = `
    <div class="celebration-content">
      <div class="celebration-icon">🏆</div>
      <h3>Nível Completo!</h3>
      <p>Você completou o nível ${level.title} de ${game.title}!</p>
      <p>+15 XP | +1 ⭐</p>
      <button class="btn close-celebration">Continuar</button>
    </div>
  `;
  celebration.style.position = 'fixed';
  celebration.style.top = '0';
  celebration.style.left = '0';
  celebration.style.width = '100%';
  celebration.style.height = '100%';
  celebration.style.backgroundColor = 'rgba(0,0,0,0.7)';
  celebration.style.display = 'flex';
  celebration.style.justifyContent = 'center';
  celebration.style.alignItems = 'center';
  celebration.style.zIndex = '1000';
  
  const content = celebration.querySelector('.celebration-content');
  content.style.backgroundColor = 'white';
  content.style.borderRadius = '12px';
  content.style.padding = '20px';
  content.style.textAlign = 'center';
  content.style.maxWidth = '300px';
  content.style.animation = 'celebrationPop 0.5s';
  
  const icon = celebration.querySelector('.celebration-icon');
  icon.style.fontSize = '50px';
  icon.style.marginBottom = '10px';
  icon.style.animation = 'celebrationBounce 1s infinite';
  
  document.body.appendChild(celebration);
  playSound('win');
  
  // Adicionar estilos de animação se não existirem
  if (!document.getElementById('celebration-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'celebration-styles';
    styleEl.textContent = `
      @keyframes celebrationPop {
        0% { transform: scale(0.7); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes celebrationBounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-15px); }
      }
    `;
    document.head.appendChild(styleEl);
  }
  
  // Fechar comemoração
  celebration.querySelector('.close-celebration').addEventListener('click', () => {
    celebration.style.opacity = '0';
    celebration.style.transition = 'opacity 0.3s';
    setTimeout(() => {
      document.body.removeChild(celebration);
      // Volta para a lista de níveis
      openGame(gameId);
    }, 300);
  });
}

// Função para embaralhar um array
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Função para comparar dois arrays
function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// NOTA: Imagens necessárias para ilustrações de lições em assets/lessons/
// Renderiza a lista de lições disponíveis
function renderLessonList(){
  const el = $('#lessonList'); 
  el.innerHTML = '';
  
  LESSONS.forEach(l => {
    const div = document.createElement('div'); 
    div.className = 'lesson-card';
    div.innerHTML = `
      <h3>${l.title}</h3>
      <div class="muted">${l.level}</div>
      <p class="small muted">${l.content.slice(0,120)}...</p>
      <div class="row" style="margin-top:8px">
        <button class="btn openLesson" data-id="${l.id}">Abrir</button>
        <button class="btn secondary startLesson" data-id="${l.id}">Marcar como concluído</button>
      </div>
    `;
    el.appendChild(div);
  });
  
  // Adiciona listeners aos botões
  $$('.openLesson').forEach(b => b.addEventListener('click', e => openLesson(e.target.dataset.id)));
  $$('.startLesson').forEach(b => b.addEventListener('click', e => startLesson(e.target.dataset.id)));
}

// Renderiza lições recentes na página inicial
function renderRecentLessons(){
  const el = $('#recentLessons'); 
  el.innerHTML='';
  
  // Mostra as 3 primeiras lições como "recentes"
  LESSONS.slice(0,3).forEach(l => {
    const card = document.createElement('div'); 
    card.className = 'card small'; 
    card.style.padding='10px'; 
    card.style.minWidth='180px';
    card.innerHTML = `
      <strong>${l.title}</strong>
      <div class="muted small">${l.vocab.map(v => v.en).join(', ')}</div>
    `;
    el.appendChild(card);
  });
}

// Abre uma lição específica para visualização
function openLesson(id){
  const lesson = LESSONS.find(x=>x.id===id);
  const cont = $('#lessonContent'); 
  cont.innerHTML='';
  
  // Cria estrutura da lição
  const card = document.createElement('div'); 
  card.className='card'; 
  card.innerHTML = `
    <h3>${lesson.title} — ${lesson.level}</h3>
    <p>${lesson.content}</p>
    <h4>Vocabulário</h4>
    <div id="vocabList"></div>
    <h4>Exercícios</h4>
    <div id="exerciseArea"></div>
    <div style="margin-top:10px" class="row">
      <button class="btn" id="completeLesson">Marcar como completo</button>
    </div>
  `;
  cont.appendChild(card);

  // Preenche vocabulário
  const vocab = card.querySelector('#vocabList');
  lesson.vocab.forEach(v => { 
    const d = document.createElement('div'); 
    d.innerHTML = `<strong>${v.en}</strong> — <span class="muted">${v.pt}</span>`; 
    vocab.appendChild(d); 
  });

  // Renderiza exercícios
  const ex = card.querySelector('#exerciseArea');
  lesson.exercises.forEach((exer, idx) => {
    const wrap = document.createElement('div'); 
    wrap.className='card small'; 
    wrap.style.marginTop='8px';
    
    // Exercício múltipla escolha
    if(exer.type==='mcq'){
      wrap.innerHTML = `<div><strong>${exer.q}</strong></div>`;
      exer.options.forEach(opt => { 
        const b=document.createElement('button'); 
        b.className='btn secondary option'; 
        b.textContent = opt; 
        b.dataset.answer = exer.answer; 
        wrap.appendChild(b); 
        b.addEventListener('click', (e)=>{
          if(e.target.textContent === exer.answer){
            playSound('win'); 
            alert('Resposta correta!'); 
            state.xp += 5; 
            state.stars += 1; 
            saveState(); 
            renderApp(); 
          } else { 
            playSound('wrong'); 
            alert('Resposta incorreta!'); 
          } 
        }); 
      });
    } 
    // Exercício preenchimento
    else if(exer.type==='fill'){
      wrap.innerHTML = `
        <div><strong>${exer.q}</strong></div>
        <input class="form-input" placeholder="Digite aqui"> 
        <button class="btn submitFill">Enviar</button>
      `;
      wrap.querySelector('.submitFill').addEventListener('click', ()=>{
        const val = wrap.querySelector('input').value.trim().toLowerCase();
        if(val === exer.answer.toLowerCase()){
          playSound('win'); 
          alert('Muito bem!'); 
          state.xp += 6; 
          state.stars += 1; 
          saveState(); 
          renderApp(); 
        } else { 
          playSound('wrong'); 
          alert('Tente novamente'); 
        } 
      });
    } 
    // Exercício de correspondência
    else if(exer.type==='match'){
      wrap.innerHTML = `
        <div><strong>${exer.q}</strong></div>
        <div class="muted small">Clique nas correspondências</div>
        <div class="matchArea" style="display:flex;gap:8px;margin-top:6px"></div>
      `;
      const area = wrap.querySelector('.matchArea');
      const left = exer.pairs.map(p=>p[0]); 
      const right = exer.pairs.map(p=>p[1]);
      
      // Cria botões para os pares
      left.forEach(item => { 
        const b = document.createElement('button'); 
        b.className='btn secondary left'; 
        b.textContent = item; 
        area.appendChild(b); 
      });
      right.forEach(item => { 
        const b = document.createElement('button'); 
        b.className='btn secondary right'; 
        b.textContent = item; 
        area.appendChild(b); 
      });
      
      // Lógica de verificação de pares
      let selLeft = null;
      area.addEventListener('click', (ev)=>{
        const t = ev.target; 
        if(t.classList.contains('left')){ 
          selLeft = t.textContent; 
          t.style.outline='3px solid rgba(255,107,107,0.25)'; 
        }
        if(t.classList.contains('right') && selLeft){ 
          const pair = exer.pairs.find(p=>p[0]===selLeft && p[1]===t.textContent); 
          if(pair){ 
            playSound('win'); 
            alert('Par correto!'); 
            state.xp += 6; 
            state.stars += 1; 
            saveState(); 
            renderApp(); 
          } else { 
            playSound('wrong'); 
            alert('Não é par'); 
          } 
          selLeft = null; 
          $$('.matchArea .left').forEach(x=>x.style.outline=''); 
        }
      });
    }
    ex.appendChild(wrap);
  });

  // Botão para marcar lição como completa
  card.querySelector('#completeLesson').addEventListener('click', ()=>{
    state.progress[id] = Math.max(state.progress[id]||0, 1);
    state.stars += 1; 
    state.xp += 10; 
    state.mission += 1; 
    saveState(); 
    renderApp(); 
    
    // Comemoração ao completar a lição
    const celebration = document.createElement('div');
    celebration.className = 'celebration';
    celebration.innerHTML = `
      <div class="celebration-content">
        <div class="celebration-icon">🎉</div>
        <h3>Parabéns!</h3>
        <p>Você completou a lição ${lesson.title}!</p>
        <p>+10 XP | +1 ⭐</p>
        <button class="btn close-celebration">Continuar</button>
      </div>
    `;
    celebration.style.position = 'fixed';
    celebration.style.top = '0';
    celebration.style.left = '0';
    celebration.style.width = '100%';
    celebration.style.height = '100%';
    celebration.style.backgroundColor = 'rgba(0,0,0,0.7)';
    celebration.style.display = 'flex';
    celebration.style.justifyContent = 'center';
    celebration.style.alignItems = 'center';
    celebration.style.zIndex = '1000';
    
    const content = celebration.querySelector('.celebration-content');
    content.style.backgroundColor = 'white';
    content.style.borderRadius = '12px';
    content.style.padding = '20px';
    content.style.textAlign = 'center';
    content.style.maxWidth = '300px';
    content.style.animation = 'celebrationPop 0.5s';
    
    const icon = celebration.querySelector('.celebration-icon');
    icon.style.fontSize = '50px';
    icon.style.marginBottom = '10px';
    icon.style.animation = 'celebrationBounce 1s infinite';
    
    document.body.appendChild(celebration);
    playSound('win');
    
    // Adicionar estilos de animação se não existirem
    if (!document.getElementById('celebration-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'celebration-styles';
      styleEl.textContent = `
        @keyframes celebrationPop {
          0% { transform: scale(0.7); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes celebrationBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
      `;
      document.head.appendChild(styleEl);
    }
    
    // Fechar comemoração
    celebration.querySelector('.close-celebration').addEventListener('click', () => {
      celebration.style.opacity = '0';
      celebration.style.transition = 'opacity 0.3s';
      setTimeout(() => {
        document.body.removeChild(celebration);
      }, 300);
    });
  });
  
  // Rolagem suave para o conteúdo
  cont.scrollIntoView({behavior:'smooth'});
}

// Inicia uma lição (atalho para openLesson com feedback sonoro)
function startLesson(id){
  openLesson(id);
  playSound('click');
}

/* ========== GERENCIAMENTO DE TURMAS (PROFESSOR) ========== */

// Cria uma nova turma
function createClass(){
  const name = $('#newClassName').value.trim();
  const level = $('#newClassLevel').value;
  if(!name){ alert('Digite o nome da turma'); return; }
  
  const newClass = {
    id: 'c' + Date.now(),
    name,
    level,
    students: []
  };
  
  state.classes.push(newClass);
  saveState();
  renderClassesList();
  $('#newClassName').value = '';
  alert('Turma criada!');
}

// Renderiza a lista de turmas
function renderClassesList(){
  const el = $('#classesList'); 
  if(!el) return;
  el.innerHTML = '';
  
  // Verificação de perfil professor
  if(!state.user || state.user.role !== 'teacher'){
    el.innerHTML = '<div class="muted">Área disponível apenas para professores.</div>';
    return;
  }
  
  if(state.classes.length === 0){
    el.innerHTML = '<div class="muted">Nenhuma turma criada ainda.</div>';
    return;
  }
  
  // Renderiza cada turma
  state.classes.forEach(klass => {
    const card = document.createElement('div'); 
    card.className = 'card small'; 
    card.style.marginBottom='8px';
    
    const studentsCount = klass.students.length;
    const totalXP = klass.students.reduce((s,st)=> s + (st.xp||0), 0);
    const avgXP = studentsCount ? Math.round(totalXP / studentsCount) : 0;
    const totalStars = klass.students.reduce((s,st)=> s + (st.stars||0), 0);
    
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <strong>${klass.name}</strong>
          <div class="muted small">${klass.level} • ${studentsCount} aluno(s)</div>
        </div>
        <div class="row">
          <button class="btn viewClass" data-id="${klass.id}">Abrir</button>
          <button class="btn secondary deleteClass" data-id="${klass.id}">Excluir</button>
        </div>
      </div>
      <div class="muted small" style="margin-top:8px">
        Média XP: ${avgXP} • Estrelas totais: ${totalStars}
      </div>
    `;
    el.appendChild(card);
  });
  
  // Adiciona listeners
  $$('.viewClass').forEach(b => b.addEventListener('click', e => openClass(e.target.dataset.id)));
  $$('.deleteClass').forEach(b => b.addEventListener('click', e => {
    const id = e.target.dataset.id;
    if(confirm('Excluir turma? Esta ação removerá os alunos desta turma localmente.')){ 
      state.classes = state.classes.filter(c=>c.id!==id); 
      saveState(); 
      renderClassesList(); 
      $('#classDetail').innerHTML=''; 
      alert('Turma excluída'); 
    }
  }));
}

// Abre os detalhes de uma turma específica
function openClass(classId){
  const klass = state.classes.find(c=>c.id===classId);
  if(!klass) return;
  
  const detail = $('#classDetail'); 
  detail.innerHTML = '';
  const wrapper = document.createElement('div'); 
  wrapper.className='card';
  
  // Estrutura do painel de turma
  wrapper.innerHTML = `
    <h3>${klass.name} — ${klass.level}</h3>
    <div class="muted small">Alunos: ${klass.students.length}</div>
    <div style="margin-top:10px" id="studentsArea"></div>
    <div style="margin-top:12px">
      <h4>Adicionar aluno</h4>
      <div class="form">
        <input id="newStudentName" placeholder="Nome do aluno">
        <div class="row"><button id="addStudentBtn" class="btn">Adicionar</button></div>
      </div>
    </div>
    <div style="margin-top:12px" id="classActions"></div>
  `;
  detail.appendChild(wrapper);

  // Renderiza a lista de alunos
  function renderStudents(){
    const sa = wrapper.querySelector('#studentsArea'); 
    sa.innerHTML = '';
    
    if(klass.students.length === 0){ 
      sa.innerHTML = '<div class="muted">Nenhum aluno ainda.</div>'; 
      return; 
    }
    
    klass.students.forEach(s => {
      const sdiv = document.createElement('div'); 
      sdiv.className = 'card small'; 
      sdiv.style.marginBottom='6px';
      
      // Calcula lições completas
      const completed = Object.keys(s.progress || {}).length;
      
      sdiv.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <strong>${s.name}</strong>
            <div class="muted small">
              XP: ${s.xp || 0} • ⭐ ${s.stars || 0} • Lições completas: ${completed}
            </div>
          </div>
          <div class="row">
            <button class="btn viewStudent" data-class="${klass.id}" data-student="${s.id}">Ver</button>
            <button class="btn secondary removeStudent" data-class="${klass.id}" data-student="${s.id}">Remover</button>
          </div>
        </div>
      `;
      sa.appendChild(sdiv);
    });
    
    // Listeners para os botões
    $$('.viewStudent').forEach(b => b.addEventListener('click', e => {
      viewStudentDetail(e.target.dataset.class, e.target.dataset.student);
    }));
    
    $$('.removeStudent').forEach(b => b.addEventListener('click', e => {
      if(confirm('Remover aluno da turma?')){ 
        const c = state.classes.find(x=>x.id===e.target.dataset.class); 
        c.students = c.students.filter(st=>st.id!==e.target.dataset.student); 
        saveState(); 
        renderClassesList(); 
        renderStudents(); 
      } 
    }));
  }

  // Adiciona novo aluno à turma
  wrapper.querySelector('#addStudentBtn').addEventListener('click', (ev)=>{
    ev.preventDefault();
    const name = wrapper.querySelector('#newStudentName').value.trim();
    if(!name){ alert('Digite o nome do aluno'); return; }
    
    const newStudent = { 
      id: 's' + Date.now(), 
      name, 
      xp:0, 
      stars:0, 
      progress: {} 
    };
    
    klass.students.push(newStudent);
    saveState();
    wrapper.querySelector('#newStudentName').value = '';
    renderClassesList();
    renderStudents();
    alert('Aluno adicionado!');
  });

  // Ações da turma
  const classActions = wrapper.querySelector('#classActions');
  classActions.innerHTML = `
    <button id="markAllZero" class="btn secondary">Zerar progresso (local)</button>
  `;
  
  classActions.querySelector('#markAllZero').addEventListener('click', ()=>{
    if(confirm('Zerar progresso de todos os alunos desta turma?')){ 
      klass.students.forEach(s=>{ 
        s.xp = 0; 
        s.stars = 0; 
        s.progress = {}; 
      }); 
      saveState(); 
      renderApp(); 
      openClass(classId); 
      alert('Progresso zerado para a turma.'); 
    } 
  });

  renderStudents();
  detail.scrollIntoView({behavior:'smooth'});
}

// Mostra detalhes de um aluno específico
function viewStudentDetail(classId, studentId){
  const klass = state.classes.find(c=>c.id===classId);
  if(!klass) return;
  
  const student = klass.students.find(s=>s.id===studentId);
  if(!student) return;
  
  // Inicializa propriedades se não existirem
  if (!student.completedLessons) student.completedLessons = [];
  if (!student.gameProgress) student.gameProgress = {};
  if (!student.xp) student.xp = 0;
  if (!student.stars) student.stars = 0;
  
  // Calcular estatísticas do aluno
  const totalLessons = LESSONS.length;
  const completedLessons = Object.keys(student.progress || {}).length;
  const completionPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  
  // Calcular progresso nos jogos
  let completedGames = 0;
  let totalGameLevels = 0;
  
  GAMES.forEach(game => {
    game.levels.forEach(level => {
      totalGameLevels++;
      const gameProgressKey = `${game.id}_${level.id}`;
      if (student.gameProgress && student.gameProgress[gameProgressKey] === 'completed') {
        completedGames++;
      }
    });
  });
  
  const gameCompletionPercentage = totalGameLevels > 0 ? Math.round((completedGames / totalGameLevels) * 100) : 0;
  
  const detail = $('#classDetail'); 
  detail.innerHTML = '';
  const wrapper = document.createElement('div'); 
  wrapper.className='card';
  
  // Estrutura do painel do aluno com estatísticas
  wrapper.innerHTML = `
    <h3>${student.name}</h3>
    
    <div class="student-stats" style="display:flex;flex-wrap:wrap;gap:10px;margin:15px 0">
      <div class="stat-card card small" style="flex:1;min-width:120px;text-align:center;padding:10px">
        <div class="stat-title">Progresso Geral</div>
        <div class="stat-value" style="font-size:24px;font-weight:bold">${completionPercentage}%</div>
        <div class="progress-bar" style="height:8px;background:#eee;border-radius:4px;margin-top:5px">
          <div class="progress-fill" style="height:100%;background:#4CAF50;border-radius:4px;width:${completionPercentage}%"></div>
        </div>
      </div>
      <div class="stat-card card small" style="flex:1;min-width:120px;text-align:center;padding:10px">
        <div class="stat-title">XP Total</div>
        <div class="stat-value" style="font-size:24px;font-weight:bold">${student.xp || 0}</div>
      </div>
      <div class="stat-card card small" style="flex:1;min-width:120px;text-align:center;padding:10px">
        <div class="stat-title">Estrelas</div>
        <div class="stat-value" style="font-size:24px;font-weight:bold">${student.stars || 0} ⭐</div>
      </div>
      <div class="stat-card card small" style="flex:1;min-width:120px;text-align:center;padding:10px">
        <div class="stat-title">Progresso Jogos</div>
        <div class="stat-value" style="font-size:24px;font-weight:bold">${gameCompletionPercentage}%</div>
        <div class="progress-bar" style="height:8px;background:#eee;border-radius:4px;margin-top:5px">
          <div class="progress-fill" style="height:100%;background:#2196F3;border-radius:4px;width:${gameCompletionPercentage}%"></div>
        </div>
      </div>
    </div>
    
    <div class="tabs" style="margin-top:15px">
      <div class="tab-buttons" style="display:flex;margin-bottom:10px">
        <button id="tab-lessons" class="btn" style="flex:1">Lições</button>
        <button id="tab-games" class="btn secondary" style="flex:1">Jogos</button>
      </div>
      <div id="tab-content-lessons" class="tab-content">
        <h4>Progresso nas Lições</h4>
        <div class="lesson-progress-list">
          ${LESSONS.map(l => {
            const done = student.progress && student.progress[l.id];
            return `
              <div class="card small" style="margin-top:6px;${done ? 'border-left:4px solid #4CAF50' : ''}">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <div>
                    <strong>${l.title}</strong>
                    <div class="muted small">${l.level}</div>
                  </div>
                  <div>
                    <button class="btn ${done ? 'danger' : 'success'} markComplete" data-class="${classId}" data-student="${studentId}" data-lesson="${l.id}">
                      ${done ? 'Desmarcar' : 'Marcar completo'}
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      <div id="tab-content-games" class="tab-content" style="display:none">
        <h4>Progresso nos Jogos</h4>
        <div class="game-progress-list">
          ${GAMES.map(game => {
            return `
              <div class="card small" style="margin-top:10px">
                <div style="display:flex;align-items:center;margin-bottom:8px">
                  <div style="font-size:24px;margin-right:10px">${game.icon}</div>
                  <div>
                    <strong>${game.title}</strong>
                    <div class="muted small">${game.description}</div>
                  </div>
                </div>
                <div class="game-levels" style="display:flex;flex-wrap:wrap;gap:5px;margin-top:5px">
                  ${game.levels.map(level => {
                    const gameProgressKey = `${game.id}_${level.id}`;
                    const completed = student.gameProgress && student.gameProgress[gameProgressKey] === 'completed';
                    return `
                      <div class="game-level card small" style="flex:1;min-width:100px;padding:8px;${completed ? 'border-left:4px solid #2196F3' : ''}">
                        <div style="display:flex;justify-content:space-between;align-items:center">
                          <span>${level.title}</span>
                          <button class="btn btn-sm ${completed ? 'danger' : 'success'}" 
                                  onclick="${completed ? 'desmarcarJogoAluno' : 'marcarJogoAluno'}('${classId}', '${studentId}', '${game.id}', '${level.id}')">
                            ${completed ? 'Desmarcar' : 'Marcar'}
                          </button>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
    
    <div style="margin-top:20px">
      <button id="backToClass" class="btn secondary">Voltar para Turma</button>
    </div>
  `;
  detail.appendChild(wrapper);

  // Listeners para marcar/desmarcar lições
  $$('.markComplete').forEach(b => b.addEventListener('click', (e)=>{
    const cid = e.target.dataset.class; 
    const sid = e.target.dataset.student; 
    const lid = e.target.dataset.lesson;
    
    const c = state.classes.find(x=>x.id===cid); 
    const s = c.students.find(x=>x.id===sid);
    
    if(s.progress && s.progress[lid]){ // Desmarcar
      delete s.progress[lid];
      s.xp = Math.max(0, (s.xp || 0) - 10);
      s.stars = Math.max(0, (s.stars || 0) - 1);
      alert('Marcação removida.');
    } else { // Marcar completo
      s.progress[lid] = 1;
      s.xp = (s.xp || 0) + 10;
      s.stars = (s.stars || 0) + 1;
      alert('Lição marcada como completa para o aluno.');
    }
    
    saveState();
    viewStudentDetail(cid, sid); // Recarrega
    renderClassesList();
  }));

  // Botão voltar
  wrapper.querySelector('#backToClass').addEventListener('click', ()=> 
    openClass(classId)
  );
  
  // Controle de abas
  wrapper.querySelector('#tab-lessons').addEventListener('click', () => {
    wrapper.querySelector('#tab-lessons').classList.remove('secondary');
    wrapper.querySelector('#tab-games').classList.add('secondary');
    wrapper.querySelector('#tab-content-lessons').style.display = 'block';
    wrapper.querySelector('#tab-content-games').style.display = 'none';
  });
  
  wrapper.querySelector('#tab-games').addEventListener('click', () => {
    wrapper.querySelector('#tab-games').classList.remove('secondary');
    wrapper.querySelector('#tab-lessons').classList.add('secondary');
    wrapper.querySelector('#tab-content-lessons').style.display = 'none';
    wrapper.querySelector('#tab-content-games').style.display = 'block';
  });
}

// Marca um jogo como completo para um aluno
function marcarJogoAluno(classId, studentId, gameId, levelId) {
  const classObj = state.classes.find(c => c.id === classId);
  if (!classObj) return;
  
  const student = classObj.students.find(s => s.id === studentId);
  if (!student) return;
  
  // Inicializa o objeto de progresso de jogos se não existir
  if (!student.gameProgress) student.gameProgress = {};
  
  // Marca o nível do jogo como completo
  const gameProgressKey = `${gameId}_${levelId}`;
  student.gameProgress[gameProgressKey] = 'completed';
  
  // Adiciona XP e estrelas
  student.xp = (student.xp || 0) + 15;
  student.stars = (student.stars || 0) + 1;
  
  // Salva o estado e atualiza a interface
  saveState();
  viewStudentDetail(classId, studentId);
  renderClassesList();
  
  alert('Jogo marcado como completo para o aluno.');
}

// Desmarca um jogo como completo para um aluno
function desmarcarJogoAluno(classId, studentId, gameId, levelId) {
  const classObj = state.classes.find(c => c.id === classId);
  if (!classObj) return;
  
  const student = classObj.students.find(s => s.id === studentId);
  if (!student) return;
  
  // Verifica se o objeto de progresso de jogos existe
  if (!student.gameProgress) return;
  
  // Remove a marcação do nível do jogo
  const gameProgressKey = `${gameId}_${levelId}`;
  if (student.gameProgress[gameProgressKey]) {
    delete student.gameProgress[gameProgressKey];
    
    // Reduz XP e estrelas
    student.xp = Math.max(0, (student.xp || 0) - 15);
    student.stars = Math.max(0, (student.stars || 0) - 1);
    
    // Salva o estado e atualiza a interface
    saveState();
    viewStudentDetail(classId, studentId);
    renderClassesList();
    
    alert('Marcação de jogo removida para o aluno.');
  }
}

// NOTA: Imagens necessárias para avatares de usuários em assets/avatars/
// Renderiza pré-visualização do perfil
function renderProfilePreview(){
  // Preenche campos do formulário
  $('#profileName').value = state.user ? state.user.name : '';
  $('#profileDob').value = state.user ? state.user.dob || '' : '';
  $('#profileHobbies').value = state.user ? state.user.hobbies || '' : '';
  $('#profileBio').value = state.user ? state.user.bio || '' : '';
  
  const preview = $('#profilePreview'); 
  preview.innerHTML = '';
  
  if(state.user && (state.user.photo || state.user.name)){
    const d = document.createElement('div'); 
    d.className='card small'; 
    d.innerHTML = `
      <div><strong>${state.user.name}</strong></div>
      <div class="muted">${state.user.dob || ''}</div>
      <div style="margin-top:8px">${state.user.hobbies || ''}</div>
      <div style="margin-top:8px">${state.user.bio || ''}</div>
    `;
    
    if(state.user.photo){ 
      const img = document.createElement('img'); 
      img.src = state.user.photo; 
      img.style.maxWidth='120px'; 
      img.style.borderRadius='8px'; 
      d.appendChild(img); 
    }
    
    preview.appendChild(d);
  }
}

// Alterna entre views da aplicação
function switchView(v){
  // Esconde todas as views
  $$('.view').forEach(x => x.style.display = 'none');
  
  // Verificação especial para turmas (apenas professores)
  if(v === 'classes' && (!state.user || state.user.role !== 'teacher')){
    $('#view_home').style.display = 'block';
    alert('Apenas professores podem acessar Gerenciar Turmas.');
    return;
  }
  
  // Mostra a view solicitada
  $(`#view_${v}`).style.display = 'block';
  
  // Atualiza navegação ativa
  $$('.navbtn').forEach(n=> n.classList.remove('active'));
  $(`.navbtn[data-view="${v}"]`)?.classList.add('active');
  
  // Atualiza a lista de jogos quando a view de jogos é selecionada
  if(v === 'games') {
    renderGamesList();
  }
}

// Finaliza o salvamento do perfil (chamado após upload de foto)
function finishProfileSave(name, dob, hobbies, bio){
  state.user.name = name || state.user.name;
  state.user.dob = dob || state.user.dob;
  state.user.hobbies = hobbies || state.user.hobbies;
  state.user.bio = bio || state.user.bio;
  saveState(); 
  renderApp(); 
  alert('Perfil salvo!');
}


init();