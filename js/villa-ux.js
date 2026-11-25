(function () {
    'use strict';

    var perfil = document.body.getAttribute('data-perfil');
    var tituloOriginal = document.title;
    var semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var caixaAvisos = document.createElement('div');
    caixaAvisos.className = 'cmd-toasts';
    caixaAvisos.setAttribute('role', 'status');
    caixaAvisos.setAttribute('aria-live', 'polite');
    document.body.appendChild(caixaAvisos);

    function avisar(titulo, texto) {
        var aviso = document.createElement('div');
        aviso.className = 'cmd-toast';
        var corpo = document.createElement('div');
        var t = document.createElement('strong');
        t.textContent = titulo;
        corpo.appendChild(t);
        if (texto) {
            var d = document.createElement('span');
            d.textContent = texto;
            corpo.appendChild(d);
        }
        aviso.appendChild(corpo);
        caixaAvisos.appendChild(aviso);

        setTimeout(function () {
            aviso.classList.add('saindo');
            setTimeout(function () { aviso.remove(); }, 260);
        }, 4500);
    }

    function observarTexto(el, aoMudar) {
        if (!el) return;
        var ultimo = el.textContent.trim();
        new MutationObserver(function () {
            var atual = el.textContent.trim();
            if (atual === ultimo) return;
            var anterior = ultimo;
            ultimo = atual;
            aoMudar(atual, anterior);
        }).observe(el, { childList: true, characterData: true, subtree: true });
    }

    function pulsar(el) {
        if (!el || semMovimento) return;
        el.classList.remove('cmd-pulso');
        void el.offsetWidth;
        el.classList.add('cmd-pulso');
    }

    function semAcento(texto) {
        return String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    }

    var CAMPOS_FICHA = [
        ['ingredientes', 'Ingredientes'],
        ['preparo', 'Preparo'],
        ['tempo', 'Tempo'],
        ['diferencial', 'Diferencial'],
    ];

    function lerFicha(bruto) {
        var partes = String(bruto || '').split(/\r?\n---\r?\n/);
        var ficha = { texto: partes[0].trim(), ingredientes: '', preparo: '', tempo: '', diferencial: '' };
        if (partes.length > 1) {
            partes.slice(1).join('\n').split(/\r?\n/).forEach(function (linha) {
                CAMPOS_FICHA.forEach(function (c) {
                    var m = linha.match(new RegExp('^\\s*' + c[1] + '\\s*:\\s*(.*)$', 'i'));
                    if (m) ficha[c[0]] = m[1].trim();
                });
            });
        }
        return ficha;
    }

    function montarFicha(ficha) {
        var linhas = CAMPOS_FICHA
            .filter(function (c) { return ficha[c[0]]; })
            .map(function (c) { return c[1] + ': ' + ficha[c[0]]; });
        return linhas.length ? ficha.texto + '\n---\n' + linhas.join('\n') : ficha.texto;
    }

    var FICHA_EXEMPLO = {
        'bolinho de bacalhau': { ingredientes: 'Bacalhau, batata, cebola, salsa', preparo: 'Massa modelada à mão e frita na hora', tempo: '15 min', diferencial: 'Molho da casa servido à parte' },
        'batata rustica': { ingredientes: 'Batata com casca, alho, alecrim, maionese defumada', preparo: 'Assada e finalizada na fritura para ficar crocante', tempo: '20 min', diferencial: 'Maionese defumada feita na casa' },
        'picanha na chapa': { ingredientes: 'Picanha, sal grosso, arroz, farofa, vinagrete', preparo: 'Selada na chapa bem quente e finalizada no ponto', tempo: '25 min', diferencial: 'Serve duas pessoas' },
        'caipirinha de limao': { ingredientes: 'Cachaça, limão, açúcar, gelo', preparo: 'Limão macerado na hora, no seu ponto de doçura', tempo: '3 min', diferencial: 'Preparada na hora, sem mistura pronta' },
        'pudim da casa': { ingredientes: 'Leite, leite condensado, ovos, calda de caramelo', preparo: 'Cozido em banho-maria e servido gelado', tempo: 'Feito de véspera', diferencial: 'Calda de caramelo da casa' },
    };

    var PAPEIS = { cliente: 'Cliente', atendente: 'Atendente', admin: 'Administrador' };

    function decorarSidebar() {
        var rodape = document.querySelector('.cmd-sidebar-rodape');
        var nomeEl = rodape && rodape.querySelector('.js-nome-usuario');
        if (!rodape || !nomeEl) return;

        var antigo = rodape.querySelector('.cmd-texto-claro');
        if (antigo) antigo.remove();

        var cartao = document.createElement('div');
        cartao.className = 'cmd-usuario';
        var avatar = document.createElement('span');
        avatar.className = 'cmd-avatar';
        avatar.setAttribute('aria-hidden', 'true');
        var coluna = document.createElement('div');
        coluna.className = 'cmd-usuario-dados';
        var papel = document.createElement('span');
        papel.className = 'cmd-usuario-papel';
        papel.textContent = PAPEIS[perfil] || '';

        rodape.insertBefore(cartao, rodape.firstChild);
        cartao.appendChild(avatar);
        cartao.appendChild(coluna);
        coluna.appendChild(nomeEl);
        coluna.appendChild(papel);

        function iniciais() {
            var partes = nomeEl.textContent.trim().split(/\s+/).filter(Boolean);
            var t = (partes[0] ? partes[0][0] : '') + (partes.length > 1 ? partes[partes.length - 1][0] : '');
            avatar.textContent = t.toUpperCase();
        }
        iniciais();
        observarTexto(nomeEl, iniciais);
    }

    function minutosDesde(iso) {
        return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    }

    function tempoTexto(iso) {
        var m = minutosDesde(iso);
        if (m < 1) return 'agora mesmo';
        if (m < 60) return 'há ' + m + ' min';
        return 'há ' + Math.floor(m / 60) + ' h';
    }

    function lerBanco(tabela) {
        try { return Banco.ler(tabela) || []; } catch { return []; }
    }

    function desenharBarras(caixa, linhas, cor) {
        caixa.textContent = '';
        var maximo = Math.max.apply(null, [1].concat(linhas.map(function (l) { return l[1]; })));
        linhas.forEach(function (l) {
            var linha = document.createElement('div');
            linha.className = 'cmd-barra-linha';
            var rotulo = document.createElement('span');
            rotulo.className = 'cmd-barra-rotulo';
            rotulo.textContent = l[0];
            var trilho = document.createElement('span');
            trilho.className = 'cmd-barra-trilho';
            var preenche = document.createElement('span');
            preenche.className = 'cmd-barra-preenche' + (cor ? ' ' + cor : '');
            preenche.style.width = Math.round((l[1] / maximo) * 100) + '%';
            trilho.appendChild(preenche);
            var valor = document.createElement('span');
            valor.className = 'cmd-barra-valor';
            valor.textContent = l[1];
            linha.appendChild(rotulo);
            linha.appendChild(trilho);
            linha.appendChild(valor);
            caixa.appendChild(linha);
        });
    }

    function lembrarAba() {
        if (!perfil) return;
        var chave = 'villa:aba:' + perfil;

        document.addEventListener('shown.bs.tab', function (e) {
            try { sessionStorage.setItem(chave, e.target.id); } catch {  }
        });

        var salvo = null;
        try { salvo = sessionStorage.getItem(chave); } catch {  }
        var botao = salvo && document.getElementById(salvo);
        if (botao && !botao.classList.contains('active') && window.bootstrap) {
            window.bootstrap.Tab.getOrCreateInstance(botao).show();
        }
    }

    function iniciarCliente() {
        var campo = document.getElementById('busca-cardapio');
        var lista = document.getElementById('lista-cardapio');
        var contagem = document.getElementById('busca-contagem');
        var vazia = document.getElementById('busca-vazia');
        var vazioCategoria = document.getElementById('cardapio-vazio');

        function enriquecer() {
            for (var i = 0; i < lista.children.length; i++) {
                var col = lista.children[i];
                if (col.dataset.pronto) continue;
                col.dataset.pronto = '1';

                var descEl = col.querySelector('.js-descricao');
                var nomeEl = col.querySelector('.js-nome');
                var corpo = col.querySelector('.card-body');
                if (!descEl || !nomeEl || !corpo) continue;

                var ficha = lerFicha(descEl.textContent);
                var semFicha = !(ficha.ingredientes || ficha.preparo || ficha.tempo || ficha.diferencial);
                if (semFicha) {
                    var ex = FICHA_EXEMPLO[semAcento(nomeEl.textContent.trim())];
                    if (ex) Object.keys(ex).forEach(function (k) { ficha[k] = ex[k]; });
                }

                descEl.textContent = ficha.texto;
                descEl.hidden = !ficha.texto;

                var linhas = [
                    ['Ingredientes', ficha.ingredientes],
                    ['Como é feito', ficha.preparo],
                    ['Diferencial', ficha.diferencial],
                ].filter(function (l) { return l[1]; });

                var texto = descEl.parentNode;
                if (ficha.tempo) {
                    var chip = document.createElement('span');
                    chip.className = 'cmd-meta-tempo';
                    chip.textContent = ficha.tempo;
                    var cat = texto.querySelector('.js-categoria');
                    if (cat) cat.after(chip); else texto.appendChild(chip);
                }

                if (linhas.length) {
                    var dl = document.createElement('dl');
                    dl.className = 'cmd-ficha';
                    linhas.forEach(function (l) {
                        var bloco = document.createElement('div');
                        var dt = document.createElement('dt');
                        dt.textContent = l[0];
                        var dd = document.createElement('dd');
                        dd.textContent = l[1];
                        bloco.appendChild(dt);
                        bloco.appendChild(dd);
                        dl.appendChild(bloco);
                    });
                    texto.appendChild(dl);
                }

            }
        }

        function aplicarBusca() {
            var termo = semAcento(campo.value.trim());
            var cards = lista.children;
            var visiveis = 0;

            for (var i = 0; i < cards.length; i++) {
                var bate = !termo || semAcento(cards[i].textContent).indexOf(termo) !== -1;
                cards[i].hidden = !bate;
                if (bate) visiveis++;
            }

            var total = cards.length;
            vazia.classList.toggle('d-none', !(termo && total > 0 && visiveis === 0));
            contagem.textContent = total === 0 ? '' : visiveis + (visiveis === 1 ? ' item' : ' itens') +
                (termo ? ' para “' + campo.value.trim() + '”' : ' disponíveis');
        }

        campo.addEventListener('input', aplicarBusca);
        campo.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && campo.value) {
                campo.value = '';
                aplicarBusca();
            }
        });

        new MutationObserver(function () { enriquecer(); aplicarBusca(); }).observe(lista, { childList: true });
        enriquecer();
        aplicarBusca();

        document.addEventListener('keydown', function (e) {
            var alvo = e.target;
            var digitando = alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.tagName === 'SELECT');
            if (e.key === '/' && !digitando && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                var aba = document.getElementById('tab-cardapio');
                if (aba && !aba.classList.contains('active') && window.bootstrap) {
                    window.bootstrap.Tab.getOrCreateInstance(aba).show();
                }
                campo.focus();
            }
        });

        var mesa = document.getElementById('chamado-mesa');
        var menos = document.getElementById('mesa-menos');
        var mais = document.getElementById('mesa-mais');
        var dica = document.getElementById('mesa-lembrada');
        if (mesa && menos && mais) {
            var lembrada = null;
            try { lembrada = localStorage.getItem('villa:mesa'); } catch {  }
            if (lembrada && !mesa.value) {
                mesa.value = lembrada;
                dica.textContent = 'Usamos a mesa do seu último chamado (' + lembrada + '). Altere se for outra.';
                dica.hidden = false;
            }
            function ajustar(delta) {
                var v = parseInt(mesa.value, 10);
                mesa.value = Math.max(1, (isNaN(v) ? 0 : v) + delta);
                mesa.dispatchEvent(new Event('input', { bubbles: true }));
            }
            menos.addEventListener('click', function () { ajustar(-1); });
            mais.addEventListener('click', function () { ajustar(1); });
            mesa.addEventListener('input', function () {
                dica.hidden = true;
                var v = parseInt(mesa.value, 10);
                if (v > 0) { try { localStorage.setItem('villa:mesa', String(v)); } catch {  } }
            });
        }

        if (vazioCategoria) {
            new MutationObserver(function () {
                if (!vazioCategoria.classList.contains('d-none')) vazia.classList.add('d-none');
            }).observe(vazioCategoria, { attributes: true, attributeFilter: ['class'] });
        }

        observarTexto(document.getElementById('status-chamado'), function (atual) {
            if (atual === 'Enviado') avisar('Chamado enviado', 'Um atendente já foi avisado.');
            else if (atual === 'Em atendimento') avisar('Já vão até a sua mesa', 'Seu chamado está em atendimento.');
            else if (atual === 'Atendido') avisar('Chamado atendido', 'Se precisar de algo mais, é só chamar.');
        });
    }

    function iniciarAtendente() {
        var badgeChamados = document.getElementById('badge-chamados');
        var badgeFila = document.getElementById('badge-fila');

        function numero(el) { return parseInt(el.textContent, 10) || 0; }

        function atualizarTitulo() {
            var n = numero(badgeChamados);
            document.title = (n > 0 ? '(' + n + ') ' : '') + tituloOriginal;
        }

        observarTexto(badgeChamados, function (atual, anterior) {
            pulsar(badgeChamados);
            atualizarTitulo();
            if ((parseInt(atual, 10) || 0) > (parseInt(anterior, 10) || 0)) {
                avisar('Novo chamado', atual + (atual === '1' ? ' mesa aguarda' : ' mesas aguardam') + ' atendimento.');
            }
        });

        observarTexto(badgeFila, function (atual, anterior) {
            pulsar(badgeFila);
            if ((parseInt(atual, 10) || 0) > (parseInt(anterior, 10) || 0)) {
                avisar('Novo pedido na fila', atual + (atual === '1' ? ' pedido' : ' pedidos') + ' em andamento.');
            }
        });

        atualizarTitulo();

        var buscaPedido = document.getElementById('busca-pedido');
        var listaItens = document.getElementById('pedido-lista-itens');
        if (buscaPedido && listaItens) {
            var filtrarPedido = function () {
                var termo = semAcento(buscaPedido.value.trim());
                Array.prototype.forEach.call(listaItens.children, function (c) {
                    c.hidden = !!termo && semAcento(c.textContent).indexOf(termo) === -1;
                });
            };
            buscaPedido.addEventListener('input', filtrarPedido);
            new MutationObserver(filtrarPedido).observe(listaItens, { childList: true });
        }
        observarTexto(document.getElementById('pedido-total'), function () {
            pulsar(document.getElementById('pedido-total'));
        });

        var tira = document.getElementById('tira-chamados');
        var lista = document.getElementById('lista-chamados');

        function desenharTira() {
            if (!tira) return;
            var todos = lerBanco('chamados');
            var hoje = new Date().toDateString();
            var abertos = todos.filter(function (c) { return c.status === 'aberto'; });
            var andamento = todos.filter(function (c) { return c.status === 'em_atendimento'; });
            var atendidosHoje = todos.filter(function (c) { return c.status === 'atendido' && new Date(c.criado_em).toDateString() === hoje; });
            var maior = abertos.reduce(function (m, c) { return Math.max(m, minutosDesde(c.criado_em)); }, 0);

            var dados = [
                ['Aguardando', abertos.length, abertos.length ? 'atenção' : ''],
                ['Em atendimento', andamento.length, ''],
                ['Atendidos hoje', atendidosHoje.length, ''],
                ['Maior espera', abertos.length ? (maior < 1 ? '< 1 min' : maior + ' min') : '—', maior >= 5 ? 'atenção' : ''],
            ];
            tira.textContent = '';
            dados.forEach(function (d) {
                var item = document.createElement('div');
                item.className = 'cmd-tira-item' + (d[2] ? ' ' + d[2] : '');
                var valor = document.createElement('strong');
                valor.textContent = d[1];
                var rotulo = document.createElement('span');
                rotulo.textContent = d[0];
                item.appendChild(valor);
                item.appendChild(rotulo);
                tira.appendChild(item);
            });
        }

        function marcarUrgentes() {
            Array.prototype.forEach.call(lista.querySelectorAll('.cmd-chamado'), function (card) {
                var status = card.querySelector('.js-status');
                var tempo = card.querySelector('.js-tempo');
                if (!status || !tempo) return;
                var m = tempo.textContent.match(/há (\d+) (min|h)/);
                var minutos = m ? (m[2] === 'h' ? parseInt(m[1], 10) * 60 : parseInt(m[1], 10)) : 0;
                var urgente = /aberto/i.test(status.textContent) && minutos >= 5;
                card.classList.toggle('cmd-urgente', urgente);
            });
        }

        if (lista) {
            new MutationObserver(function () { marcarUrgentes(); desenharTira(); }).observe(lista, { childList: true });
            marcarUrgentes();
        }
        desenharTira();
        setInterval(desenharTira, 15000);
        window.addEventListener('storage', desenharTira);

    }

    function iniciarAdmin() {
        ['resumo-chamados', 'resumo-pedidos', 'resumo-itens', 'resumo-atendentes'].forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) return;

            var escrito = el.textContent.trim();
            var quadro = 0;

            function animar(de, para) {
                cancelAnimationFrame(quadro);
                if (semMovimento || de === para) { escrito = String(para); el.textContent = escrito; return; }
                var inicio = performance.now();
                var duracao = 600;
                (function passo(agora) {
                    var p = Math.min((agora - inicio) / duracao, 1);
                    var v = Math.round(de + (para - de) * (1 - Math.pow(1 - p, 3)));
                    escrito = String(v);
                    el.textContent = escrito;
                    if (p < 1) quadro = requestAnimationFrame(passo);
                })(inicio);
            }

            new MutationObserver(function () {
                var atual = el.textContent.trim();
                if (atual === escrito) return;
                var alvo = parseInt(atual, 10);
                if (isNaN(alvo)) return;
                animar(parseInt(escrito, 10) || 0, alvo);
            }).observe(el, { childList: true, characterData: true, subtree: true });

            var inicial = parseInt(escrito, 10);
            if (!isNaN(inicial) && inicial > 0) animar(0, inicial);
        });
    }

    function iniciarFichaItem() {
        var form = document.getElementById('form-item');
        var desc = document.getElementById('item-descricao');
        if (!form || !desc) return;

        var campos = {};
        CAMPOS_FICHA.forEach(function (c) { campos[c[0]] = document.getElementById('item-' + c[0]); });

        var original = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');

        function preencher(ficha) {
            CAMPOS_FICHA.forEach(function (c) { if (campos[c[0]]) campos[c[0]].value = ficha[c[0]] || ''; });
        }

        Object.defineProperty(desc, 'value', {
            configurable: true,
            get: function () { return original.get.call(this); },
            set: function (v) {
                var ficha = lerFicha(v);
                original.set.call(this, ficha.texto);
                preencher(ficha);
            },
        });

        form.addEventListener('reset', function () { preencher({}); });

        form.addEventListener('submit', function () {
            var ficha = { texto: original.get.call(desc).trim() };
            CAMPOS_FICHA.forEach(function (c) { ficha[c[0]] = (campos[c[0]].value || '').trim().replace(/\s*\n\s*/g, ' '); });
            original.set.call(desc, montarFicha(ficha));
            setTimeout(function () {
                var atual = original.get.call(desc);
                if (/\r?\n---\r?\n/.test(atual)) original.set.call(desc, lerFicha(atual).texto);
            }, 0);
        }, true);
    }

    function iniciarPainelAdmin() {
        var ultimos = document.getElementById('ult-chamados');
        var hora = document.getElementById('ult-chamados-hora');
        var barrasFila = document.getElementById('barras-fila');
        var barrasCat = document.getElementById('barras-categorias');
        if (!ultimos || !barrasFila || !barrasCat) return;

        var NOME_STATUS = { aberto: 'Aberto', em_atendimento: 'Em atendimento', atendido: 'Atendido', cancelado: 'Cancelado' };

        function desenhar() {
            var chamados = lerBanco('chamados').slice(-5).reverse();
            ultimos.textContent = '';
            if (!chamados.length) {
                var vazio = document.createElement('li');
                vazio.className = 'cmd-vazio';
                vazio.textContent = 'Nenhum chamado ainda. Quando um cliente chamar, aparece aqui.';
                ultimos.appendChild(vazio);
            }
            chamados.forEach(function (c) {
                var li = document.createElement('li');
                li.className = 'cmd-atividade';
                var mesa = document.createElement('span');
                mesa.className = 'cmd-atividade-mesa';
                mesa.textContent = c.mesa;
                var corpo = document.createElement('span');
                corpo.className = 'cmd-atividade-corpo';
                var tit = document.createElement('strong');
                tit.textContent = 'Mesa ' + c.mesa + ' · ' + (c.motivo || 'Chamado');
                var sub = document.createElement('span');
                sub.textContent = tempoTexto(c.criado_em);
                corpo.appendChild(tit);
                corpo.appendChild(sub);
                var selo = document.createElement('span');
                selo.className = 'badge cmd-status ' + (c.status === 'aberto' ? 'text-bg-warning' : c.status === 'atendido' ? 'text-bg-success' : c.status === 'cancelado' ? 'text-bg-secondary' : 'text-bg-info');
                selo.textContent = NOME_STATUS[c.status] || c.status;
                li.appendChild(mesa);
                li.appendChild(corpo);
                li.appendChild(selo);
                ultimos.appendChild(li);
            });
            hora.textContent = 'atualizado ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            var pedidos = lerBanco('pedidos');
            desenharBarras(barrasFila, [
                ['Em andamento', pedidos.filter(function (p) { return p.status !== 'entregue'; }).length],
                ['Finalizados', pedidos.filter(function (p) { return p.status === 'entregue'; }).length],
            ], 'verde');

            var itens = lerBanco('itens_cardapio');
            var cats = ['Entradas', 'Petiscos', 'Pratos', 'Drinks', 'Sobremesas'];
            desenharBarras(barrasCat, cats.map(function (c) {
                return [c, itens.filter(function (i) { return i.categoria === c; }).length];
            }), '');
        }

        desenhar();
        setInterval(desenhar, 8000);
        window.addEventListener('storage', desenhar);
        document.addEventListener('shown.bs.tab', desenhar);
    }

    function iniciarTabelasAdmin() {

        Array.prototype.forEach.call(document.querySelectorAll('[data-busca-tabela]'), function (caixa) {
            var corpo = document.getElementById(caixa.getAttribute('data-busca-tabela'));
            var campo = caixa.querySelector('input');
            if (!corpo || !campo) return;

            function filtrar() {
                var termo = semAcento(campo.value.trim());
                Array.prototype.forEach.call(corpo.children, function (tr) {
                    tr.hidden = !!termo && semAcento(tr.textContent).indexOf(termo) === -1;
                });
            }
            campo.addEventListener('input', filtrar);
            new MutationObserver(filtrar).observe(corpo, { childList: true });
        });

        var corpoItens = document.getElementById('corpo-cardapio');
        if (corpoItens) {
            var colocar = function () {
                var itens = lerBanco('itens_cardapio');
                Array.prototype.forEach.call(corpoItens.children, function (tr) {
                    var td = tr.querySelector('.js-nome');
                    if (!td || td.querySelector('.cmd-miniatura')) return;
                    var nome = td.textContent.trim();
                    var item = itens.filter(function (i) { return i.nome === nome; })[0];
                    var mini;
                    if (item && item.imagem) {
                        mini = document.createElement('img');
                        mini.src = item.imagem;
                        mini.alt = '';
                    } else {
                        mini = document.createElement('span');
                        mini.textContent = nome.charAt(0).toUpperCase();
                    }
                    mini.className = 'cmd-miniatura';
                    var linhaNome = document.createElement('div');
                    linhaNome.className = 'd-flex align-items-center gap-3';
                    var textoNome = document.createElement('span');
                    textoNome.textContent = nome;
                    td.textContent = '';
                    linhaNome.appendChild(mini);
                    linhaNome.appendChild(textoNome);
                    td.appendChild(linhaNome);
                });
            };
            new MutationObserver(colocar).observe(corpoItens, { childList: true });
            colocar();
        }
    }

    function iniciarImagemItem() {
        var guarda = document.getElementById('item-imagem');
        var area = document.getElementById('zona-imagem-area');
        var arquivo = document.getElementById('item-imagem-arquivo');
        var link = document.getElementById('item-imagem-link');
        var remover = document.getElementById('item-imagem-remover');
        var form = document.getElementById('form-item');
        if (!guarda || !area || !arquivo) return;

        var previa = null;
        var MAX_LADO = 720;
        var MAX_ORIGINAL = 12 * 1024 * 1024;

        function mostrar(valor) {
            valor = (valor || '').trim();
            if (valor) {
                if (!previa) {
                    previa = document.createElement('img');
                    previa.className = 'cmd-zona-previa';
                    previa.alt = 'Prévia da imagem do item';
                    area.insertBefore(previa, area.firstChild);
                }
                previa.src = valor;
            } else if (previa) {
                previa.remove();
                previa = null;
            }
            area.classList.toggle('com-imagem', !!valor);
            remover.hidden = !valor;
            if (document.activeElement !== link) {
                var linkVisivel = valor.indexOf('data:') === 0 ? '' : valor;
                if (link.value !== linkVisivel) link.value = linkVisivel;
            }
        }

        var original = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
        Object.defineProperty(guarda, 'value', {
            configurable: true,
            get: function () { return original.get.call(this); },
            set: function (v) { original.set.call(this, v); mostrar(v); },
        });
        if (form) form.addEventListener('reset', function () {
            setTimeout(function () { mostrar(guarda.value); }, 0);
        });

        function definir(valor) {
            guarda.value = valor;
        }

        function processar(file) {
            if (!file) return;
            if (file.type.indexOf('image/') !== 0) {
                avisar('Arquivo não aceito', 'Escolha uma imagem (JPG, PNG, WEBP...).');
                return;
            }
            if (file.size > MAX_ORIGINAL) {
                avisar('Imagem muito grande', 'Use um arquivo de até 12 MB.');
                return;
            }

            var leitor = new FileReader();
            leitor.onerror = function () { avisar('Não consegui ler o arquivo', 'Tente outra imagem.'); };
            leitor.onload = function () {
                var img = new Image();
                img.onerror = function () { avisar('Imagem inválida', 'Esse arquivo não pôde ser aberto.'); };
                img.onload = function () {
                    var escala = Math.min(1, MAX_LADO / Math.max(img.width, img.height));
                    var tela = document.createElement('canvas');
                    tela.width = Math.max(1, Math.round(img.width * escala));
                    tela.height = Math.max(1, Math.round(img.height * escala));
                    tela.getContext('2d').drawImage(img, 0, 0, tela.width, tela.height);

                    var saida = tela.toDataURL('image/webp', 0.82);
                    if (saida.indexOf('data:image/webp') !== 0) saida = tela.toDataURL('image/jpeg', 0.85);
                    definir(saida);
                    avisar('Imagem pronta', 'Ela será salva junto com o item.');
                };
                img.src = leitor.result;
            };
            leitor.readAsDataURL(file);
        }

        arquivo.addEventListener('change', function () {
            processar(arquivo.files && arquivo.files[0]);
            arquivo.value = '';
        });

        ['dragenter', 'dragover'].forEach(function (nome) {
            area.addEventListener(nome, function (e) {
                e.preventDefault();
                area.classList.add('arrastando');
            });
        });
        ['dragleave', 'dragend'].forEach(function (nome) {
            area.addEventListener(nome, function () { area.classList.remove('arrastando'); });
        });
        area.addEventListener('drop', function (e) {
            e.preventDefault();
            area.classList.remove('arrastando');
            var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
            if (f) processar(f);
        });

        ['dragover', 'drop'].forEach(function (nome) {
            document.addEventListener(nome, function (e) {
                if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') !== -1) {
                    e.preventDefault();
                }
            });
        });

        document.addEventListener('paste', function (e) {
            var painel = document.getElementById('aba-cardapio');
            if (!painel || !painel.classList.contains('active')) return;
            var itens = (e.clipboardData && e.clipboardData.items) || [];
            for (var i = 0; i < itens.length; i++) {
                if (itens[i].kind === 'file' && itens[i].type.indexOf('image/') === 0) {
                    e.preventDefault();
                    processar(itens[i].getAsFile());
                    return;
                }
            }
        });

        link.addEventListener('input', function () { definir(link.value.trim()); });
        remover.addEventListener('click', function () { definir(''); });

        mostrar(guarda.value);
    }

    function iniciarLogin() {
        Array.prototype.forEach.call(document.querySelectorAll('input[type="password"]'), function (campo) {
            var pai = campo.parentNode;
            var envolucro = document.createElement('div');
            envolucro.className = 'cmd-senha';
            pai.insertBefore(envolucro, campo);
            envolucro.appendChild(campo);

            var botao = document.createElement('button');
            botao.type = 'button';
            botao.className = 'cmd-senha-botao';
            botao.textContent = 'Mostrar';
            botao.setAttribute('aria-pressed', 'false');
            botao.setAttribute('aria-label', 'Mostrar senha');
            envolucro.appendChild(botao);

            var aviso = document.createElement('div');
            aviso.className = 'form-text cmd-aviso-caps';
            aviso.textContent = 'Caps Lock está ligado.';
            aviso.hidden = true;
            envolucro.after(aviso);

            botao.addEventListener('click', function () {
                var mostrar = campo.type === 'password';
                campo.type = mostrar ? 'text' : 'password';
                botao.textContent = mostrar ? 'Ocultar' : 'Mostrar';
                botao.setAttribute('aria-pressed', mostrar ? 'true' : 'false');
                botao.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
                campo.focus();
            });

            function caps(e) {
                if (e.getModifierState) aviso.hidden = !e.getModifierState('CapsLock');
            }
            campo.addEventListener('keydown', caps);
            campo.addEventListener('keyup', caps);
            campo.addEventListener('blur', function () { aviso.hidden = true; });
        });

        ['login-erro', 'cad-erro'].forEach(function (id) {
            var caixa = document.getElementById(id);
            if (!caixa) return;

            var visivel = !caixa.classList.contains('d-none');
            new MutationObserver(function () {
                var agora = !caixa.classList.contains('d-none');
                if (agora === visivel) return;
                visivel = agora;
                if (agora && !semMovimento) {
                    caixa.classList.remove('cmd-treme');
                    void caixa.offsetWidth;
                    caixa.classList.add('cmd-treme');
                }
            }).observe(caixa, { attributes: true, attributeFilter: ['class'] });
        });
    }

    function atalhoConteudo() {
        var principal = document.querySelector('main');
        if (!principal) return;
        if (!principal.id) principal.id = 'conteudo';
        var link = document.createElement('a');
        link.className = 'cmd-pular';
        link.href = '#' + principal.id;
        link.textContent = 'Pular para o conteúdo';
        document.body.insertBefore(link, document.body.firstChild);
    }

    function iniciarFundo() {
        var principal = document.querySelector('.cmd-conteudo');
        if (!principal) return;

        var fundo = document.createElement('div');
        fundo.className = 'cmd-fundo';
        fundo.setAttribute('aria-hidden', 'true');
        var foto = document.createElement('div');
        foto.className = 'cmd-fundo-foto';
        var veu = document.createElement('div');
        veu.className = 'cmd-fundo-veu';
        fundo.appendChild(foto);
        fundo.appendChild(veu);
        principal.insertBefore(fundo, principal.firstChild);
    }

    atalhoConteudo();
    if (perfil) iniciarFundo();
    decorarSidebar();
    lembrarAba();
    if (!perfil) iniciarLogin();
    if (perfil === 'cliente') iniciarCliente();
    else if (perfil === 'atendente') iniciarAtendente();
    else if (perfil === 'admin') { iniciarAdmin(); iniciarPainelAdmin(); iniciarTabelasAdmin(); iniciarFichaItem(); iniciarImagemItem(); }
})();
