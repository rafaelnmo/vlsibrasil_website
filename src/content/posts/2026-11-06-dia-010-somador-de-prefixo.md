---
title: "Dia 010 - Somador de Prefixo (Kogge-Stone)"
description: "Dia 010 do 100 Dias de RTL: o somador de prefixo Kogge-Stone, que calcula todos os vai-uns em log2(N) níveis, e uma comparação de área e atraso entre os quatro somadores da série."
date: 2026-11-06
author: rafael
categories: ["100 Dias de RTL", "Verilog"]
tags: ["RTL", "Verilog", "Aritmética", "Somador", "Prefix Adder", "Kogge-Stone", "Yosys", "Icarus Verilog", "GTKWave"]
cover: "/assets/images/100dias/dia_010/dia_010_capa.png"
draft: true
---
Ontem o carry-lookahead encurtou o caminho do vai-um, mas os blocos ainda eram ligados em cadeia, e o atraso continuava crescendo de forma linear. Hoje fechamos a série de somadores com o **somador de prefixo** (*prefix adder*), que leva a ideia do lookahead até o fim: todos os vai-uns ficam prontos em **log₂(N) níveis** de lógica. Com 64 bits, são apenas 6 níveis de células. É a família de somadores usada nos processadores de alto desempenho.

---

## Descrição

No Dia 009, cada bloco de 4 bits se resumia em dois sinais: **`G`** (o bloco gera vai-um) e **`P`** (o bloco propaga o vai-um que chega). O ponto-chave é que esse resumo pode ser feito para **qualquer grupo de bits**, e dois grupos vizinhos podem ser **juntados** em um grupo maior.

Chamando de `G[i:j]` e `P[i:j]` a geração e a propagação do grupo que vai do bit `i` até o bit `j`, juntar o grupo da esquerda `[i:k]` com o da direita `[k-1:j]` é simples:

- o grupo inteiro **gera** se a parte da esquerda gera, **ou** se a esquerda propaga e a direita gera: `G[i:j] = G[i:k] + P[i:k]·G[k-1:j]`;
- o grupo inteiro **propaga** se as duas partes propagam: `P[i:j] = P[i:k]·P[k-1:j]`.

Essa operação é feita pela **célula de prefixo**: uma AND-OR para o `G` e uma AND para o `P`.

E onde entram os vai-uns? Se tratarmos o `cin` como um "bit -1" que só gera (`G[-1:-1] = cin` e `P[-1:-1] = 0`), o vai-um que entra no bit `i` é exatamente a geração do grupo que vai do bit `i-1` até o bit `-1`:

```text
c[i] = G[i-1:-1]
```

Calcular `G[i-1:-1]` para todos os bits ao mesmo tempo é um problema clássico da computação chamado **soma de prefixos** (*prefix sum*), e existem várias redes que o resolvem em log₂(N) níveis. Hoje vamos usar a **Kogge-Stone**: em cada nível, cada coluna junta o seu grupo com o grupo que está a uma **distância** de 1, 2, 4, 8... colunas à direita. A cada nível, o tamanho dos grupos **dobra**.

## Diagrama de Blocos

![Diagrama de blocos do somador de prefixo](/assets/images/100dias/dia_010/dia_010_diagrama_blocos.png)

| Sinal  | Direção | Largura | Descrição                          |
|--------|---------|---------|------------------------------------|
| `in_a` | entrada | WIDTH   | Operando A                         |
| `in_b` | entrada | WIDTH   | Operando B                         |
| `cin`  | entrada | 1 bit   | Vai-um de entrada (*carry in*)     |
| `sum`  | saída   | WIDTH   | Soma                               |
| `cout` | saída   | 1 bit   | Vai-um de saída (*carry out*)      |

As mesmas portas dos Dias 007, 008 e 009, com `WIDTH = 8` por padrão (3 níveis na rede de prefixo).

## Tabela Verdade

Em vez dos valores, a tabela mostra **qual grupo de bits** cada coluna da rede já resumiu depois de cada nível, para o somador de 8 bits. A notação `6:3` é o grupo `[6:3]`:

![Grupo coberto por cada coluna depois de cada nível](/assets/images/100dias/dia_010/dia_010_tabela_verdade.png)

- No **nível 0**, cada coluna conhece só o seu bit (`g` e `p`).
- No **nível 1**, cada coluna junta o seu bit com o vizinho da direita: grupos de 2 bits.
- No **nível 2**, junta com o grupo a 2 colunas de distância: grupos de 4 bits.
- No **nível 3**, com o grupo a 4 colunas: grupos de 8 bits.

Quando um grupo chega ao bit `-1` (o `cin`), ele está **completo**: aquele é o vai-um do bit seguinte, e a coluna só passa o valor adiante nos níveis seguintes. Depois de log₂(8) = 3 níveis, todas as colunas chegaram em `-1`, e todos os vai-uns `c[0]` a `c[7]` estão prontos.

## Expressões Booleanas

![Expressões do somador de prefixo](/assets/images/100dias/dia_010/dia_010_expressao_booleana.png)

- As duas primeiras são a **célula de prefixo**, que junta dois grupos vizinhos.
- O `cin` entra na rede como o grupo `[-1:-1]`.
- Cada vai-um é o `G` de um grupo que termina no bit `-1`.
- A soma é a mesma do CLA: `sum[i] = p[i] ⊕ c[i]`.
- O `cout` usa uma última célula, juntando o bit 7 com o resultado `c[7]` da rede. No diagrama ela aparece em cinza: é uma **célula cinza** (*gray cell*), que só calcula o `G`, porque ninguém depois dela precisa do `P`.

## Diagrama de Circuito

A rede Kogge-Stone de 8 bits. As colunas vão do bit 7 (à esquerda) até o `cin` (à direita), e cada círculo azul é uma célula de prefixo:

![Rede de prefixo Kogge-Stone de 8 bits](/assets/images/100dias/dia_010/dia_010_diagrama_circuito.png)

Siga uma coluna de cima para baixo e compare com a tabela. A coluna do bit 6, por exemplo, junta com o bit 5 no nível 1 (`[6:5]`), com o grupo `[4:3]` no nível 2 (`[6:3]`) e com o grupo `[2:-1]` no nível 3 (`[6:-1]`), que é o `c[7]`. As linhas azuis em diagonal mostram de onde vem cada grupo da direita, com a distância dobrando a cada nível.

Repare também que nenhum caminho passa por mais de **3 células**. Com 16 bits seriam 4 níveis, com 32 bits 5, e com 64 bits só 6.

### Comparando os quatro somadores

Medimos os somadores dos últimos quatro dias com o Yosys (síntese genérica em portas de 2 entradas), contando as portas e os níveis de lógica no caminho crítico:

| N  | `+` (Dia 007) | Ripple-carry (Dia 008) | Carry-lookahead (Dia 009) | Prefixo Kogge-Stone (Dia 010) |
|----|---------------|------------------------|---------------------------|-------------------------------|
| 8  | 52 / 12       | 64 / 17                | 78 / 9                    | 70 / 9                        |
| 16 | 113 / 16      | 128 / 33               | 156 / 13                  | 182 / 11                      |
| 32 | 238 / 20      | 256 / 65               | 312 / 21                  | 454 / 13                      |
| 64 | 491 / 24      | 512 / 129              | 624 / 37                  | 1094 / 15                     |

*(portas / níveis de lógica)*

O que a tabela mostra:

- **Ripple-carry**: menor área, mas o atraso cresce linearmente (`2N + 1` níveis).
- **Carry-lookahead em blocos**: um meio-termo; o atraso ainda cresce linearmente, só que 4 vezes mais devagar.
- **Kogge-Stone**: o mais rápido, com o atraso crescendo só 2 níveis cada vez que N dobra. O preço é a área: com 64 bits, ele usa **o dobro** de portas do ripple-carry, e a fiação longa das diagonais pesa no layout.
- **O `+` do Dia 007**: ao ver o operador `+`, o Yosys gera por padrão um somador de prefixo **Brent-Kung**, outra rede de prefixo que usa bem menos células que a Kogge-Stone, em troca de alguns níveis a mais. Ferramentas comerciais vão além e escolhem a arquitetura de acordo com a restrição de tempo do projeto.

Por isso não existe um somador "melhor": a escolha depende de quanto tempo há no ciclo de clock e de quanta área (e potência) estamos dispostos a gastar.

---

## Código Verilog

```verilog
// ============================================================================
// VLSI Brasil - 100 Dias de RTL
// Dia 010 - Somador de Prefixo Kogge-Stone (Prefix Adder)
// ----------------------------------------------------------------------------
// Descrição : Soma dois números de WIDTH bits e o vai-um de entrada cin.
//             Os vai-uns são calculados por uma rede de prefixo Kogge-Stone
//             com log2(WIDTH) níveis de células de prefixo:
//             (G, P)[i:j] = (G[i:k] OR (P[i:k] AND G[k-1:j]), P[i:k] AND P[k-1:j])
//             {cout, sum} = in_a + in_b + cin
// ============================================================================

`timescale 1ns / 1ps

module somador_prefixo #(
    parameter WIDTH = 8                 // largura dos operandos
) (
    input  wire [WIDTH-1:0] in_a,       // operando A
    input  wire [WIDTH-1:0] in_b,       // operando B
    input  wire             cin,        // vai-um de entrada (carry in)
    output wire [WIDTH-1:0] sum,        // soma
    output wire             cout        // vai-um de saída (carry out)
);

    localparam NIVEIS = $clog2(WIDTH);  // número de níveis da rede de prefixo

    // Geração e propagação de cada bit
    wire [WIDTH-1:0] g = in_a & in_b;
    wire [WIDTH-1:0] p = in_a ^ in_b;

    // G[n][k] e P[n][k]: geração e propagação do grupo que termina na
    // coluna k, depois do nível n. A coluna k representa o bit k-1, e a
    // coluna 0 representa o vai-um de entrada (bit -1).
    wire [WIDTH-1:0] G [0:NIVEIS];
    wire [WIDTH-1:0] P [0:NIVEIS];

    // Nível 0: o vai-um de entrada se comporta como um bit que só gera
    assign G[0] = {g[WIDTH-2:0], cin};
    assign P[0] = {p[WIDTH-2:0], 1'b0};

    genvar n, k;
    generate
        for (n = 1; n <= NIVEIS; n = n + 1) begin : g_nivel
            for (k = 0; k < WIDTH; k = k + 1) begin : g_coluna
                if (k >= (1 << (n - 1))) begin : g_celula
                    // Célula de prefixo: junta o grupo k com o grupo
                    // 2^(n-1) colunas à direita
                    assign G[n][k] = G[n-1][k] | (P[n-1][k] & G[n-1][k - (1 << (n - 1))]);
                    assign P[n][k] = P[n-1][k] & P[n-1][k - (1 << (n - 1))];
                end else begin : g_fio
                    // Grupo já completo: só passa adiante
                    assign G[n][k] = G[n-1][k];
                    assign P[n][k] = P[n-1][k];
                end
            end
        end
    endgenerate

    // Depois do último nível, G[NIVEIS][k] é o vai-um que entra no bit k
    wire [WIDTH-1:0] carry = G[NIVEIS];

    assign sum  = p ^ carry;
    assign cout = g[WIDTH-1] | (p[WIDTH-1] & carry[WIDTH-1]);

endmodule
```

O que há de novo aqui:

- **`$clog2`**: uma função do sistema que calcula o teto de log₂ de um número **durante a elaboração**. `$clog2(8) = 3`, `$clog2(64) = 6`, e `$clog2(5) = 3`. Ela é muito usada para dimensionar vetores e contadores a partir de parâmetros.
- **Vetores de vetores (arrays)**: `wire [WIDTH-1:0] G [0:NIVEIS];` declara `NIVEIS + 1` vetores de `WIDTH` bits. `G[n]` é o vetor inteiro do nível `n`, e `G[n][k]` é o bit `k` desse vetor. As dimensões **antes** do nome são a largura de cada elemento; as dimensões **depois** do nome são o número de elementos.
- **`generate` aninhado**: um laço para os níveis e outro para as colunas, com `genvar n, k`. Juntos, eles criam a rede inteira.
- **`if` dentro do `generate`**: a condição `k >= (1 << (n - 1))` é avaliada na elaboração e decide se aquela posição recebe uma **célula de prefixo** ou só um **fio**. Os dois ramos têm nomes (`g_celula` e `g_fio`), e por isso uma célula aparece na hierarquia como `g_nivel[2].g_coluna[5].g_celula`.
- **Deslocamento como potência de 2**: `1 << (n - 1)` vale 1, 2, 4, ... e dá a distância de cada nível.

Graças ao `$clog2`, o mesmo código funciona para qualquer largura, inclusive as que não são potência de 2: com `WIDTH = 5` a rede tem 3 níveis, e as colunas que já completaram o grupo apenas passam o valor adiante.

## Testbench

O mesmo testbench dos últimos dias, agora apontando para o `somador_prefixo`:

```verilog
// ============================================================================
// VLSI Brasil - 100 Dias de RTL
// Dia 010 - Testbench do Somador de Prefixo
// ============================================================================

`timescale 1ns / 1ps

module tb_somador_prefixo;

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
    somador_prefixo #(.WIDTH(WIDTH)) dut (
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
        $dumpfile("tb_somador_prefixo.vcd");
        $dumpvars(0, tb_somador_prefixo);

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

Ao longo de quatro dias, **um único testbench** verificou quatro implementações bem diferentes do mesmo somador. Esse é o poder de verificar contra um **modelo de referência** (`in_a + in_b + cin`) em vez de contra os detalhes da implementação.

---

## Simulação

### Diagrama de tempo esperado

Os mesmos 7 testes dirigidos de 8 bits do Dia 009:

![Diagrama de tempo esperado](/assets/images/100dias/dia_010/dia_010_diagrama_tempo_esperado.png)

### Rodando no Icarus Verilog

```bash
# compila o projeto e o testbench
iverilog -g2012 -Wall -o tb_somador_prefixo.vvp rtl/somador_prefixo.v rtl/tb_somador_prefixo.v

# executa a simulação
vvp tb_somador_prefixo.vvp
```

A saída no terminal:

```text
VCD info: dumpfile tb_somador_prefixo.vcd opened for output.
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

E com 64 bits (6 níveis de prefixo):

```bash
iverilog -g2012 -Wall -P tb_somador_prefixo.WIDTH=64 -o tb_somador_prefixo.vvp rtl/somador_prefixo.v rtl/tb_somador_prefixo.v
vvp tb_somador_prefixo.vvp
```

```text
WIDTH = 64
SUCESSO: 1007 testes passaram!
```

### Formas de onda no GTKWave

```bash
gtkwave tb_somador_prefixo.vcd
```

![Resultado da simulação no GTKWave](/assets/images/100dias/dia_010/dia_010_simulacao_gtkwave.png)

> **Dica:** por padrão, o Icarus Verilog **não** grava arrays no VCD, então `G` e `P` não aparecem no GTKWave. Por isso o código copia o último nível para o fio `carry` (`wire [WIDTH-1:0] carry = G[NIVEIS];`): além de deixar as equações da saída mais legíveis, ele mostra os vai-uns de todos os bits nas formas de onda. Em `255 + 1` (entre 20 e 30 ns), `carry` vale `11111110`: o vai-um chega em todos os bits, menos no bit 0.

---

## Resumo

- Os sinais de geração e propagação podem resumir **qualquer grupo de bits**, e a **célula de prefixo** junta dois grupos vizinhos: `G = G_esq + P_esq·G_dir`, `P = P_esq·P_dir`.
- Tratando o `cin` como o bit `-1`, o vai-um de cada bit é `c[i] = G[i-1:-1]`, um problema de **soma de prefixos**.
- A rede **Kogge-Stone** resolve esse problema em log₂(N) níveis, dobrando a distância a cada nível: o caminho crítico cresce só 2 níveis de lógica quando N dobra.
- A velocidade custa área: com 64 bits, o Kogge-Stone usa o dobro de portas do ripple-carry. A escolha do somador é sempre um compromisso entre atraso, área e potência.
- Em Verilog: `$clog2`, arrays (`wire [W-1:0] G [0:N]`), `generate` aninhado e `if` dentro do `generate`.

Com isso fechamos a série de somadores. No **Dia 011** vamos usar o que construímos para fazer o caminho inverso: o **subtrator**, usando a representação em **complemento de dois**. Até amanhã!
