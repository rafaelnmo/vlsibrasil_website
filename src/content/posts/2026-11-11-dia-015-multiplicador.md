---
title: "Dia 015 - Multiplicador"
description: "Dia 015 do 100 Dias de RTL: o multiplicador em matriz com produtos parciais e linhas de somadores, comparado com árvores de somadores e a codificação de Booth na síntese do Yosys."
date: 2026-11-11
author: rafael
categories: ["100 Dias de RTL", "Verilog"]
tags: ["RTL", "Verilog", "Aritmética", "Multiplicador", "Yosys", "Icarus Verilog", "GTKWave"]
cover: "/assets/images/100dias/dia_015/dia_015_capa.png"
draft: true
---
Com somadores, subtratores e deslocadores prontos, chegou a hora da **multiplicação**. Em binário, ela é ainda mais simples do que em decimal: a "tabuada" tem só `0 × 0`, `0 × 1`, `1 × 0` e `1 × 1`, e cada um desses produtos é uma porta AND. Hoje vamos montar o **multiplicador em matriz** (*array multiplier*), que faz em hardware exatamente a conta armada que aprendemos na escola, usando o somador do Dia 007.

---

## Descrição

O multiplicador recebe dois números sem sinal de `WIDTH` bits e gera um produto de **2·WIDTH bits**. Por que o dobro? O maior produto possível com 4 bits é `15 × 15 = 225`, que precisa de 8 bits. Em geral, `(2ᴺ - 1)² < 2²ᴺ`, então 2N bits sempre bastam.

A multiplicação binária armada funciona assim:

1. Para cada bit `in_b[i]` do multiplicador, escrevemos um **produto parcial** `pp[i]`: é `in_a` se `in_b[i] = 1`, ou zero se `in_b[i] = 0`. Ou seja, `pp[i] = in_a AND in_b[i]`, bit a bit.
2. Cada produto parcial é deslocado `i` posições para a esquerda (multiplicado por `2^i`).
3. Somamos todos os produtos parciais.

![Produtos parciais de 11 × 13](/assets/images/100dias/dia_015/dia_015_produtos_parciais.png)

Na figura, `11 × 13`: `in_b = 1101` tem três bits em `1`, então três produtos parciais são cópias de `in_a = 1011` (amarelo), e um é zero (cinza). Somando as colunas, chegamos a `1000 1111` = **143**.

O passo 3 é o mais caro: com `WIDTH` produtos parciais, precisamos de `WIDTH - 1` somas. O multiplicador em matriz faz essas somas **uma linha por vez**, acumulando o resultado. Em cada linha, o bit menos significativo da soma acumulada **já está pronto**: nenhuma linha seguinte vai mexer nele, porque os próximos produtos parciais estão todos deslocados mais para a esquerda. Esse bit vira um bit do produto, e o resto da soma desce para a próxima linha.

## Diagrama de Blocos

![Diagrama de blocos do multiplicador](/assets/images/100dias/dia_015/dia_015_diagrama_blocos.png)

| Sinal     | Direção | Largura   | Descrição                          |
|-----------|---------|-----------|------------------------------------|
| `in_a`    | entrada | WIDTH     | Multiplicando                      |
| `in_b`    | entrada | WIDTH     | Multiplicador                      |
| `product` | saída   | 2·WIDTH   | Produto `in_a × in_b`              |

## Tabela Verdade

O menor multiplicador interessante é o de 2 × 2 bits: 4 entradas, 16 linhas e um produto de 4 bits.

![Tabela verdade do multiplicador 2x2](/assets/images/100dias/dia_015/dia_015_tabela_verdade.png)

O produto só usa os 4 bits no caso `3 × 3 = 9` (`1001`), a única linha com `p[3] = 1`.

## Expressões Booleanas

Montando o 2 × 2 com a conta armada, os produtos parciais são `a[0]·b[0]`, `a[1]·b[0]`, `a[0]·b[1]` e `a[1]·b[1]`, e as colunas se somam com **meios somadores** (Dia 005):

![Expressões do multiplicador 2x2](/assets/images/100dias/dia_015/dia_015_expressao_booleana.png)

- `p[0]` é um produto parcial sozinho na coluna 0.
- `p[1]` soma os dois produtos parciais da coluna 1 (a soma do meio somador é uma XOR), e o vai-um dessa soma é `c`.
- `p[2]` soma o último produto parcial com o vai-um `c`, e `p[3]` é o vai-um final.

Ou seja: um multiplicador 2 × 2 são **4 portas AND e 2 meios somadores**. O multiplicador de `WIDTH` bits é a mesma ideia, com somadores de `WIDTH` bits no lugar dos meios somadores.

## Diagrama de Circuito

O multiplicador de 4 bits: 4 produtos parciais (as ANDs) e 3 linhas de somadores do Dia 007.

![Multiplicador em matriz de 4 bits](/assets/images/100dias/dia_015/dia_015_diagrama_circuito.png)

Em cada linha, o somador recebe o novo produto parcial e a soma da linha de cima **deslocada uma posição** (sem o bit 0, que já foi para o produto, e com o vai-um no lugar do MSB). Depois da última linha, os 4 bits que sobram formam a metade de cima do produto.

O custo dessa estrutura é o **atraso**: o resultado precisa atravessar todas as linhas em série, e dentro de cada linha o vai-um ainda precisa se propagar. Medindo com o Yosys (portas de 2 entradas, sem otimização da ABC), comparando com o operador `*` do Verilog:

| WIDTH | Matriz (nosso) | `*` (padrão do Yosys) | `*` com Booth (`synth -booth`) |
|-------|----------------|-----------------------|--------------------------------|
| 4     | 76 / 15        | 67 / 13               | 112 / 16                       |
| 8     | 411 / 41       | 347 / 24              | 409 / 23                       |
| 16    | 1918 / 103     | 1534 / 34             | 1465 / 30                      |

*(portas / níveis de lógica no caminho crítico)*

Com 16 bits, nossa matriz tem um caminho crítico **3 vezes mais longo**. Os multiplicadores rápidos atacam os dois problemas:

- **Árvore de somadores** (Wallace, Dadda): em vez de somar uma linha por vez, somam os produtos parciais **em paralelo**, em forma de árvore, com somadores *carry-save* que não propagam o vai-um. É o que o Yosys faz por padrão com o `*`.
- **Codificação de Booth**: recodifica o multiplicador para gerar **metade** dos produtos parciais (e trata números com sinal naturalmente). A coluna da direita mostra o resultado com `synth -booth`.

Também existem multiplicadores **sequenciais**, que fazem uma linha por ciclo de clock reaproveitando um único somador: muito menores, porém N vezes mais lentos. Vamos voltar a eles quando chegarmos aos circuitos com clock.

---

## Código Verilog

```verilog
// ============================================================================
// VLSI Brasil - 100 Dias de RTL
// Dia 015 - Multiplicador em Matriz (Array Multiplier)
// ----------------------------------------------------------------------------
// Descrição : Multiplica dois números sem sinal de WIDTH bits, gerando um
//             produto de 2*WIDTH bits, como na multiplicação feita à mão:
//             1. produtos parciais: pp[i] = in_a AND in_b[i] (WIDTH ANDs)
//             2. soma acumulada: uma linha de somadores (Dia 007) por bit de
//                in_b; a cada linha, o bit menos significativo da soma já é
//                um bit final do produto.
// ============================================================================

`timescale 1ns / 1ps

module multiplicador #(
    parameter WIDTH = 4                         // largura dos operandos
) (
    input  wire [WIDTH-1:0]   in_a,             // multiplicando
    input  wire [WIDTH-1:0]   in_b,             // multiplicador
    output wire [2*WIDTH-1:0] product           // produto
);

    // Produtos parciais: pp[i] = in_a se in_b[i] = 1, senão 0
    wire [WIDTH-1:0] pp [0:WIDTH-1];

    // Soma acumulada depois de cada linha (soma e vai-um)
    wire [WIDTH-1:0] soma  [0:WIDTH-1];
    wire             carry [0:WIDTH-1];

    genvar i;
    generate
        for (i = 0; i < WIDTH; i = i + 1) begin : g_pp
            assign pp[i] = in_a & {WIDTH{in_b[i]}};
        end
    endgenerate

    // Linha 0: o primeiro produto parcial, sem soma
    assign soma[0]    = pp[0];
    assign carry[0]   = 1'b0;
    assign product[0] = soma[0][0];

    // Linhas 1 a WIDTH-1: soma o produto parcial com a soma anterior
    // deslocada de uma posição (o bit 0 dela já foi para o produto)
    generate
        for (i = 1; i < WIDTH; i = i + 1) begin : g_linha
            somador_cpa #(.WIDTH(WIDTH)) u_soma (
                .in_a (pp[i]),
                .in_b ({carry[i-1], soma[i-1][WIDTH-1:1]}),
                .cin  (1'b0),
                .sum  (soma[i]),
                .cout (carry[i])
            );
            assign product[i] = soma[i][0];
        end
    endgenerate

    // Bits de cima: o que sobrou da última linha
    assign product[2*WIDTH-1:WIDTH] = {carry[WIDTH-1], soma[WIDTH-1][WIDTH-1:1]};

endmodule
```

O que há de novo aqui:

- **Arrays de fios com uma linha por elemento**: `pp`, `soma` e `carry` são arrays (vistos no Dia 010). `soma[i]` é a soma acumulada depois da linha `i`.
- **Um `generate` que lê a iteração anterior**: a linha `i` usa `soma[i-1]` e `carry[i-1]`. Por isso o laço de somadores começa em `i = 1`, e a linha 0 é escrita fora dele: um padrão comum para estruturas em cascata.
- **Dois blocos `generate` no mesmo módulo**: um cria as ANDs, outro os somadores. Cada um tem seu próprio nome (`g_pp` e `g_linha`).
- **Replicação para "espalhar" um bit**: `{WIDTH{in_b[i]}}` cria um vetor com `WIDTH` cópias de `in_b[i]`, para a AND bit a bit com `in_a`. É a forma compacta de escrever `WIDTH` portas AND com uma entrada em comum.

> **Na prática:** em um projeto real, escrevemos `assign product = in_a * in_b;` e deixamos a síntese escolher a arquitetura, como mostra a tabela acima. Só cuidado com a largura: o resultado de `*` tem a largura do maior operando **do contexto**, então `product` precisa ter 2·WIDTH bits para não perder a metade de cima (a mesma regra do `+` do Dia 007).

## Testbench

```verilog
// ============================================================================
// VLSI Brasil - 100 Dias de RTL
// Dia 015 - Testbench do Multiplicador
// ============================================================================

`timescale 1ns / 1ps

module tb_multiplicador;

    parameter WIDTH = 4;

    // Sinais do testbench
    reg  [WIDTH-1:0]   in_a, in_b;
    wire [2*WIDTH-1:0] product;

    reg  [2*WIDTH-1:0] esperado;

    integer i;
    integer testes = 0;
    integer erros  = 0;

    // Instância do circuito sob teste (DUT - Device Under Test)
    multiplicador #(.WIDTH(WIDTH)) dut (
        .in_a    (in_a),
        .in_b    (in_b),
        .product (product)
    );

    // Modelo de referência: o operador * com resultado de 2*WIDTH bits
    task verifica;
        begin
            esperado = in_a * in_b;
            testes = testes + 1;
            if (product !== esperado) begin
                $display("ERRO: %0d x %0d -> %0d, esperado %0d",
                         in_a, in_b, product, esperado);
                erros = erros + 1;
            end
        end
    endtask

    // Aplica um teste dirigido, espera 10 ns e mostra o resultado
    task aplica(input [WIDTH-1:0] a, input [WIDTH-1:0] b);
        begin
            in_a = a; in_b = b;
            #10;
            $display(" %t | %3d x %3d = %5d | %b x %b = %b",
                     $time, in_a, in_b, product, in_a, in_b, product);
            verifica;
        end
    endtask

    initial begin
        // Arquivo de formas de onda para o GTKWave
        $dumpfile("tb_multiplicador.vcd");
        $dumpvars(0, tb_multiplicador);

        // Exibe o tempo em ns
        $timeformat(-9, 0, " ns", 6);

        $display("WIDTH = %0d", WIDTH);
        $display("--------------------------------------------------");
        $display(" tempo  |    decimal        | binário");
        $display("--------------------------------------------------");

        // Parte 1: testes dirigidos (aparecem nas formas de onda)
        aplica(3, 5);                           // 15
        aplica(11, 13);                         // o exemplo do post
        aplica(7, 0);                           // por zero
        aplica(9, 1);                           // por um
        aplica(6, 4);                           // por potência de 2: deslocamento
        aplica({WIDTH{1'b1}}, {WIDTH{1'b1}});   // maior produto possível

        // Parte 2: testes fora das formas de onda
        $dumpoff;
        if (WIDTH <= 8) begin
            // Teste exaustivo: todas as 2^(2*WIDTH) combinações
            for (i = 0; i < (1 << (2 * WIDTH)); i = i + 1) begin
                {in_a, in_b} = i;
                #10;
                verifica;
            end
        end else begin
            // 1000 testes aleatórios
            for (i = 0; i < 1000; i = i + 1) begin
                in_a = {$random, $random};
                in_b = {$random, $random};
                #10;
                verifica;
            end
        end

        $display("--------------------------------------------------");
        if (erros == 0)
            $display("SUCESSO: %0d testes passaram!", testes);
        else
            $display("FALHA: %0d erro(s) em %0d testes.", erros, testes);

        $finish;
    end

endmodule
```

O modelo de referência é o operador `*`, com `esperado` de 2·WIDTH bits. Os testes dirigidos cobrem os casos especiais: multiplicar por zero, por um, por uma potência de 2 (que é só um deslocamento: `6 × 4 = 6 << 2`) e o maior produto possível.

---

## Simulação

### Diagrama de tempo esperado

![Diagrama de tempo esperado](/assets/images/100dias/dia_015/dia_015_diagrama_tempo_esperado.png)

### Rodando no Icarus Verilog

```bash
# compila o projeto (dois módulos) e o testbench
iverilog -g2012 -Wall -o tb_multiplicador.vvp rtl/somador_cpa.v rtl/multiplicador.v rtl/tb_multiplicador.v

# executa a simulação
vvp tb_multiplicador.vvp
```

A saída no terminal, em decimal e em binário:

```text
VCD info: dumpfile tb_multiplicador.vcd opened for output.
WIDTH = 4
--------------------------------------------------
 tempo  |    decimal        | binário
--------------------------------------------------
  10 ns |   3 x   5 =    15 | 0011 x 0101 = 00001111
  20 ns |  11 x  13 =   143 | 1011 x 1101 = 10001111
  30 ns |   7 x   0 =     0 | 0111 x 0000 = 00000000
  40 ns |   9 x   1 =     9 | 1001 x 0001 = 00001001
  50 ns |   6 x   4 =    24 | 0110 x 0100 = 00011000
  60 ns |  15 x  15 =   225 | 1111 x 1111 = 11100001
--------------------------------------------------
SUCESSO: 262 testes passaram!
```

Com 16 bits (16 produtos parciais e 15 linhas de somadores):

```bash
iverilog -g2012 -Wall -P tb_multiplicador.WIDTH=16 -o tb_multiplicador.vvp rtl/somador_cpa.v rtl/multiplicador.v rtl/tb_multiplicador.v
vvp tb_multiplicador.vvp
```

```text
WIDTH = 16
SUCESSO: 1006 testes passaram!
```

### Formas de onda no GTKWave

```bash
gtkwave tb_multiplicador.vcd
```

![Resultado da simulação no GTKWave](/assets/images/100dias/dia_015/dia_015_simulacao_gtkwave.png)

> **Dica:** abra `dut` → `g_linha[1]` → `u_soma` no painel **SST** para acompanhar a soma acumulada linha a linha.

---

## Resumo

- Multiplicar dois números de N bits gera um produto de 2N bits.
- Cada **produto parcial** é `in_a AND in_b[i]`, deslocado `i` posições; o produto é a soma de todos eles.
- O **multiplicador em matriz** soma uma linha por vez com N-1 somadores, e o bit de baixo de cada linha já é um bit final do produto.
- É simples e regular, mas lento; árvores de somadores (Wallace/Dadda) e a codificação de Booth encurtam o caminho crítico.
- Em Verilog: arrays de fios em cascata, `generate` que lê a iteração anterior e replicação para espalhar um bit.

No **Dia 016** fechamos as quatro operações com o **divisor**: a divisão longa da escola, feita com subtratores e muxes. Até amanhã!
