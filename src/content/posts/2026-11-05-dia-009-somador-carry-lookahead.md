---
title: "Dia 009 - Somador Carry-Lookahead"
description: "Dia 009 do 100 Dias de RTL: o somador carry-lookahead com blocos de 4 bits, calculando os vai-uns em paralelo a partir da geração e propagação, comparado ao ripple-carry com síntese no Yosys."
date: 2026-11-05
author: rafael
categories: ["100 Dias de RTL", "Verilog"]
tags: ["RTL", "Verilog", "Aritmética", "Somador", "Carry-Lookahead", "Yosys", "Icarus Verilog", "GTKWave"]
cover: "/assets/images/100dias/dia_009/dia_009_capa.png"
draft: true
---
Ontem vimos que, no somador ripple-carry, cada bit precisa esperar o vai-um do bit anterior, e o atraso cresce linearmente com a largura. Hoje vamos "olhar adiante": o **somador carry-lookahead** (*Carry-Lookahead Adder*, ou **CLA**) usa os sinais de **geração** e **propagação** do Dia 007 para calcular os vai-uns **em paralelo**, sem esperar pela cadeia.

---

## Descrição

A ideia vem de uma observação simples: o vai-um que entra em um bit depende **só** dos bits menos significativos e do `cin`. Então, em vez de esperar que ele chegue passando por cada coluna, podemos calcular cada vai-um **diretamente** a partir das entradas.

Partimos da equação do Dia 007, `c[i+1] = g[i] + p[i]·c[i]`, e substituímos um vai-um dentro do outro:

```text
c[1] = g[0] + p[0]·c[0]
c[2] = g[1] + p[1]·c[1]
     = g[1] + p[1]·(g[0] + p[0]·c[0])
     = g[1] + p[1]·g[0] + p[1]·p[0]·c[0]
```

Agora `c[2]` não depende mais de `c[1]`: só de `g`, `p` e `c[0]` (o `cin`). Cada termo conta uma história: "há vai-um no bit 2 se o bit 1 **gera**, **ou** se o bit 1 propaga e o bit 0 gera, **ou** se os dois propagam e chegou `cin`".

Expandindo assim, **todos** os vai-uns ficam com o mesmo formato: uma soma de produtos, que vira uma camada de ANDs seguida de uma OR. Não importa o bit, o vai-um fica pronto em **dois níveis de lógica** depois de `g` e `p`.

O preço aparece quando o número de bits cresce: a expressão de `c[i]` tem `i + 1` termos, e o maior termo tem `i + 1` entradas. Por isso, na prática, o lookahead completo é feito em **blocos de 4 bits**, e os blocos são ligados entre si. Cada bloco resume seus 4 bits em dois sinais:

- **`G`** (geração do bloco): o bloco produz vai-um sozinho;
- **`P`** (propagação do bloco): os 4 bits propagam, então o vai-um que entra no bloco atravessa tudo.

Com eles, o vai-um de saída do bloco é `cout = G + P·cin`, a mesma forma de um único bit. O vai-um entre blocos ainda "escorre", mas pula **4 bits de uma vez**.

## Diagrama de Blocos

![Diagrama de blocos do somador carry-lookahead](/assets/images/100dias/dia_009/dia_009_diagrama_blocos.png)

| Sinal  | Direção | Largura | Descrição                          |
|--------|---------|---------|------------------------------------|
| `in_a` | entrada | WIDTH   | Operando A                         |
| `in_b` | entrada | WIDTH   | Operando B                         |
| `cin`  | entrada | 1 bit   | Vai-um de entrada (*carry in*)     |
| `sum`  | saída   | WIDTH   | Soma                               |
| `cout` | saída   | 1 bit   | Vai-um de saída (*carry out*)      |

As portas são as mesmas dos Dias 007 e 008. Hoje o padrão é `WIDTH = 8`, para termos **dois blocos** encadeados, e `WIDTH` precisa ser múltiplo de 4.

## Tabela Verdade

Vamos repetir a soma de ontem, `1011 + 0110` (11 + 6) com `cin = 0`, agora dentro de um bloco CLA de 4 bits:

![A soma 1011 + 0110 no bloco carry-lookahead](/assets/images/100dias/dia_009/dia_009_tabela_verdade.png)

O resultado é o mesmo do ripple-carry (`sum = 0001`, `cout = 1`), mas a forma de chegar nele muda. Veja o `c[3]`: pela equação expandida, `c[3] = g[2] + p[2]·g[1] + ...`. Como `p[2] = 1` e `g[1] = 1`, o termo `p[2]·g[1]` já vale `1`, calculado **direto** das entradas, sem esperar o `c[2]` ficar pronto.

## Expressões Booleanas

![Expressões do bloco carry-lookahead de 4 bits](/assets/images/100dias/dia_009/dia_009_expressao_booleana.png)

- `g[i]` e `p[i]`: uma AND e uma XOR por bit, todas em paralelo.
- `c[1]`, `c[2]` e `c[3]`: os vai-uns internos, já expandidos. Aqui `c[0]` é o `cin` do bloco.
- `G` e `P`: o resumo do bloco. Repare que `G` é a expressão de `c[4]` sem o último termo, e `P` é esse último termo sem o `c[0]`.
- `cout = G + P·c[0]`: o vai-um de saída tem a mesma forma do vai-um de um bit só.
- `sum[i] = p[i] ⊕ c[i]`: como `p[i] = a[i] ⊕ b[i]`, isso é o mesmo `a[i] ⊕ b[i] ⊕ c[i]` do somador completo.

## Diagrama de Circuito

O bloco de 4 bits por dentro: células `g/p` em cima, a lógica de lookahead no meio e as XORs da soma embaixo.

![Bloco carry-lookahead de 4 bits](/assets/images/100dias/dia_009/dia_009_diagrama_circuito.png)

Compare com o ripple-carry: não há mais setas de vai-um indo de uma coluna para a outra. Todos os `c[i]` saem **ao mesmo tempo** da lógica de lookahead. Para não poluir o desenho, o `p[i]` que entra em cada XOR aparece só pelo nome.

O somador de 8 bits liga dois blocos. Entre eles, o vai-um ainda passa de bloco em bloco (`carry[1]`):

![Somador CLA de 8 bits com dois blocos](/assets/images/100dias/dia_009/dia_009_diagrama_blocos_cla.png)

Medindo com o Yosys (síntese genérica em portas de 2 entradas), comparamos o caminho crítico com o do ripple-carry:

| Largura (N) | RCA: portas | RCA: níveis | CLA: portas | CLA: níveis |
|-------------|-------------|-------------|-------------|-------------|
| 8           | 64          | 17          | 78          | 9           |
| 16          | 128         | 33          | 156         | 13          |
| 32          | 256         | 65          | 312         | 21          |
| 64          | 512         | 129         | 624         | 37          |

O CLA usa cerca de **20% mais portas**, mas o caminho crítico fica **3,5 vezes mais curto** com 64 bits. Repare que ele ainda cresce de forma linear: cada bloco a mais soma 4 níveis, por causa da cadeia entre os blocos. Para quebrar isso, poderíamos aplicar o lookahead **de novo** sobre os `G` e `P` dos blocos (um segundo nível de lookahead), e assim por diante. Levar essa ideia até o fim é justamente o assunto de amanhã.

---

## Código Verilog

O projeto tem dois módulos. O primeiro é o bloco de 4 bits, uma tradução direta das expressões:

```verilog
// ============================================================================
// VLSI Brasil - 100 Dias de RTL
// Dia 009 - Bloco Carry-Lookahead de 4 bits
// ----------------------------------------------------------------------------
// Descrição : Soma dois números de 4 bits e o vai-um de entrada cin.
//             Todos os vai-uns são calculados em paralelo a partir dos sinais
//             de geração (g) e propagação (p) de cada bit:
//             g[i] = in_a[i] AND in_b[i]
//             p[i] = in_a[i] XOR in_b[i]
//             c[i+1] = g[i] OR (p[i] AND c[i])  -> expandido, sem cadeia
//             O vai-um de saída usa a geração (G) e a propagação (P) do bloco:
//             cout = G OR (P AND cin)
// ============================================================================

`timescale 1ns / 1ps

module bloco_cla_4 (
    input  wire [3:0] in_a,     // operando A
    input  wire [3:0] in_b,     // operando B
    input  wire       cin,      // vai-um de entrada (carry in)
    output wire [3:0] sum,      // soma
    output wire       cout      // vai-um de saída (carry out)
);

    // Geração e propagação de cada bit
    wire [3:0] g = in_a & in_b;     // o bit GERA vai-um sozinho
    wire [3:0] p = in_a ^ in_b;     // o bit PROPAGA o vai-um que chegar

    // Geração e propagação do bloco inteiro
    wire G = g[3] | (p[3] & g[2]) | (p[3] & p[2] & g[1])
                  | (p[3] & p[2] & p[1] & g[0]);
    wire P = &p;                    // AND de redução: p[3] & p[2] & p[1] & p[0]

    // Vai-uns internos: cada um depende só de g, p e cin (dois níveis de lógica)
    wire [3:1] c;
    assign c[1] = g[0] | (p[0] & cin);
    assign c[2] = g[1] | (p[1] & g[0]) | (p[1] & p[0] & cin);
    assign c[3] = g[2] | (p[2] & g[1]) | (p[2] & p[1] & g[0])
                       | (p[2] & p[1] & p[0] & cin);
    assign cout = G | (P & cin);

    // Soma: cada bit é a propagação XOR o vai-um que chega nele
    assign sum = p ^ {c, cin};

endmodule
```

O segundo encadeia `WIDTH/4` blocos com um `generate`, como no ripple-carry de ontem:

```verilog
// ============================================================================
// VLSI Brasil - 100 Dias de RTL
// Dia 009 - Somador Carry-Lookahead (Carry-Lookahead Adder - CLA)
// ----------------------------------------------------------------------------
// Descrição : Soma dois números de WIDTH bits e o vai-um de entrada cin,
//             usando blocos carry-lookahead de 4 bits (bloco_cla_4) em cadeia.
//             WIDTH deve ser múltiplo de 4.
//             {cout, sum} = in_a + in_b + cin
// ============================================================================

`timescale 1ns / 1ps

module somador_cla #(
    parameter WIDTH = 8                 // largura dos operandos (múltiplo de 4)
) (
    input  wire [WIDTH-1:0] in_a,       // operando A
    input  wire [WIDTH-1:0] in_b,       // operando B
    input  wire             cin,        // vai-um de entrada (carry in)
    output wire [WIDTH-1:0] sum,        // soma
    output wire             cout        // vai-um de saída (carry out)
);

    localparam BLOCOS = WIDTH / 4;

    // Vai-um entre os blocos: carry[k] entra no bloco k
    wire [BLOCOS:0] carry;

    assign carry[0] = cin;

    genvar k;
    generate
        for (k = 0; k < BLOCOS; k = k + 1) begin : g_bloco
            bloco_cla_4 cla (
                .in_a (in_a[4*k +: 4]),
                .in_b (in_b[4*k +: 4]),
                .cin  (carry[k]),
                .sum  (sum[4*k +: 4]),
                .cout (carry[k+1])
            );
        end
    endgenerate

    assign cout = carry[BLOCOS];

endmodule
```

O que há de novo aqui:

- **Declaração com atribuição**: `wire [3:0] g = in_a & in_b;` declara o fio e já liga a ele uma expressão. É uma forma curta de `wire [3:0] g;` seguido de `assign g = in_a & in_b;`.
- **Operadores bit a bit em vetores**: `in_a & in_b` e `in_a ^ in_b` operam **bit a bit**, gerando os 4 `g[i]` e os 4 `p[i]` de uma vez (4 ANDs e 4 XORs).
- **Operador de redução**: `&p` aplica a AND entre **todos os bits** de `p` e devolve um único bit. Também existem `|`, `^`, `~&`, `~|` e `~^` de redução.
- **Concatenação dentro de expressões**: em `p ^ {c, cin}`, o vetor `{c[3], c[2], c[1], cin}` tem 4 bits e se alinha com `p`, então cada `sum[i]` recebe `p[i] ^ c[i]` (com `c[0] = cin`).
- **`localparam`**: uma constante calculada dentro do módulo (`BLOCOS = WIDTH / 4`), que **não** pode ser alterada de fora, ao contrário de um `parameter`.
- **Seleção indexada de partes (`+:`)**: `in_a[4*k +: 4]` seleciona **4 bits a partir do bit `4*k`**, ou seja, `in_a[4*k+3 : 4*k]`. Dentro de um `generate`, com `k` variando, essa é a forma de fatiar um vetor em pedaços de tamanho fixo. Também existe o `-:`, que conta para baixo.

> **Atenção:** o `somador_cla` só funciona com `WIDTH` múltiplo de 4. Com `WIDTH = 6`, por exemplo, `BLOCOS = 1` e os bits 4 e 5 ficariam sem somador. Em um projeto real valeria acrescentar uma verificação, ou completar o último bloco com zeros.

## Testbench

Mais uma vez, é o mesmo testbench dos dias anteriores, trocando o nome do módulo e com `WIDTH = 8`:

```verilog
// ============================================================================
// VLSI Brasil - 100 Dias de RTL
// Dia 009 - Testbench do Somador CLA
// ============================================================================

`timescale 1ns / 1ps

module tb_somador_cla;

    parameter WIDTH = 8;

    // Sinais do testbench
    reg  [WIDTH-1:0] in_a, in_b;
    reg              cin;
    wire [WIDTH-1:0] sum;
    wire             cout;

    reg  [WIDTH:0]   esperado;          // WIDTH+1 bits: cabe o vai-um

    localparam [WIDTH-1:0] MSB = 1 << (WIDTH - 1);   // 1000...0

    integer i;
    integer testes = 0;
    integer erros  = 0;

    // Instância do circuito sob teste (DUT - Device Under Test)
    somador_cla #(.WIDTH(WIDTH)) dut (
        .in_a (in_a),
        .in_b (in_b),
        .cin  (cin),
        .sum  (sum),
        .cout (cout)
    );

    // Modelo de referência: soma em WIDTH+1 bits
    task verifica;
        begin
            esperado = in_a + in_b + cin;
            testes   = testes + 1;
            if ({cout, sum} !== esperado) begin
                $display("ERRO: %0d + %0d + %0d -> cout=%b sum=%0d, esperado %0d",
                         in_a, in_b, cin, cout, sum, esperado);
                erros = erros + 1;
            end
        end
    endtask

    // Aplica um teste dirigido, espera 10 ns e mostra o resultado
    task aplica(input [WIDTH-1:0] a, input [WIDTH-1:0] b, input c);
        begin
            in_a = a; in_b = b; cin = c;
            #10;
            $display(" %t | %3d  %3d   %b  |  %b  %3d  | %3d",
                     $time, in_a, in_b, cin, cout, sum, {cout, sum});
            verifica;
        end
    endtask

    initial begin
        // Arquivo de formas de onda para o GTKWave
        $dumpfile("tb_somador_cla.vcd");
        $dumpvars(0, tb_somador_cla);

        // Exibe o tempo em ns
        $timeformat(-9, 0, " ns", 6);

        $display("WIDTH = %0d", WIDTH);
        $display("------------------------------------------");
        $display(" tempo  |  a    b   cin | cout sum | total");
        $display("------------------------------------------");

        // Parte 1: testes dirigidos (aparecem nas formas de onda)
        aplica(3, 4, 0);                    // soma simples, sem vai-um
        aplica(5, 6, 1);                    // usa o vai-um de entrada
        aplica({WIDTH{1'b1}}, 1, 0);        // 11...1 + 1: o vai-um atravessa tudo
        aplica({WIDTH{1'b1}}, 0, 1);        // mesmo efeito, vindo de cin
        aplica(MSB, MSB, 0);                // só os bits mais significativos: estouro
        aplica({WIDTH{1'b1}}, {WIDTH{1'b1}}, 1); // maior soma possível
        aplica(0, 0, 0);                    // menor soma possível

        // Parte 2: testes fora das formas de onda
        $dumpoff;
        if (WIDTH <= 8) begin
            // Teste exaustivo: todas as 2^(2*WIDTH+1) combinações
            for (i = 0; i < (1 << (2 * WIDTH + 1)); i = i + 1) begin
                {in_a, in_b, cin} = i;
                #10;
                verifica;
            end
        end else begin
            // Largura grande demais para o exaustivo: 1000 testes aleatórios
            for (i = 0; i < 1000; i = i + 1) begin
                in_a = {$random, $random};
                in_b = {$random, $random};
                cin  = $random;
                #10;
                verifica;
            end
        end

        $display("------------------------------------------");
        if (erros == 0)
            $display("SUCESSO: %0d testes passaram!", testes);
        else
            $display("FALHA: %0d erro(s) em %0d testes.", erros, testes);

        $finish;
    end

endmodule
```

Com 8 bits, o teste exaustivo percorre 2¹⁷ = 131.072 combinações, o que o Icarus Verilog roda em poucos segundos.

---

## Simulação

### Diagrama de tempo esperado

Os mesmos 7 testes dirigidos, agora com 8 bits (o valor máximo de cada operando é 255):

![Diagrama de tempo esperado](/assets/images/100dias/dia_009/dia_009_diagrama_tempo_esperado.png)

### Rodando no Icarus Verilog

```bash
# compila o projeto (dois módulos) e o testbench
iverilog -g2012 -Wall -o tb_somador_cla.vvp rtl/bloco_cla_4.v rtl/somador_cla.v rtl/tb_somador_cla.v

# executa a simulação
vvp tb_somador_cla.vvp
```

A saída no terminal:

```text
VCD info: dumpfile tb_somador_cla.vcd opened for output.
WIDTH = 8
------------------------------------------
 tempo  |  a    b   cin | cout sum | total
------------------------------------------
  10 ns |   3    4   0  |  0    7  |   7
  20 ns |   5    6   1  |  0   12  |  12
  30 ns | 255    1   0  |  1    0  | 256
  40 ns | 255    0   1  |  1    0  | 256
  50 ns | 128  128   0  |  1    0  | 256
  60 ns | 255  255   1  |  1  255  | 511
  70 ns |   0    0   0  |  0    0  |   0
------------------------------------------
SUCESSO: 131079 testes passaram!
```

E com 32 bits (8 blocos):

```bash
iverilog -g2012 -Wall -P tb_somador_cla.WIDTH=32 -o tb_somador_cla.vvp rtl/bloco_cla_4.v rtl/somador_cla.v rtl/tb_somador_cla.v
vvp tb_somador_cla.vvp
```

```text
WIDTH = 32
SUCESSO: 1007 testes passaram!
```

### Formas de onda no GTKWave

```bash
gtkwave tb_somador_cla.vcd
```

![Resultado da simulação no GTKWave](/assets/images/100dias/dia_009/dia_009_simulacao_gtkwave.png)

O sinal `dut.carry` mostra os vai-uns **entre os blocos** (`carry[0]` é o `cin` e `carry[2]` é o `cout`). Em `255 + 1` (entre 20 e 30 ns), ele vale `110`: o bloco 0 gera vai-um para o bloco 1, que o propaga até a saída.

> **Dica:** abra `dut` → `g_bloco[0]` → `cla` no painel **SST** para ver os `g`, `p`, `G`, `P` e `c` de cada bloco.

---

## Resumo

- O **somador carry-lookahead** calcula os vai-uns em paralelo, expandindo `c[i+1] = g[i] + p[i]·c[i]` até depender só de `g`, `p` e `cin`.
- Na prática, o lookahead é feito em blocos de 4 bits, que se resumem em `G` e `P`: `cout = G + P·cin`.
- Os blocos ainda são encadeados, mas o vai-um pula 4 bits por vez: com 64 bits, o caminho crítico caiu de 129 para 37 níveis, com cerca de 20% a mais de portas.
- Em Verilog: declaração de `wire` com atribuição, operadores de redução (`&p`), concatenação em expressões, `localparam` e seleção indexada de partes (`[4*k +: 4]`).

No **Dia 010** vamos levar a ideia do lookahead até o fim com o **somador de prefixo**, que calcula todos os vai-uns em `log₂(N)` níveis. É o somador usado nos processadores de alto desempenho. Até amanhã!
