---
title: "Dia 013 - Deslocador (Barrel Shifter)"
description: "Dia 013 do 100 Dias de RTL: o deslocador barrel com deslocamentos lógicos e aritméticos em log2(N) estágios de muxes, e funções em Verilog."
date: 2026-11-09
author: rafael
categories: ["100 Dias de RTL", "Verilog"]
tags: ["RTL", "Verilog", "Deslocador", "Barrel Shifter", "function", "Icarus Verilog", "GTKWave"]
cover: "/assets/images/100dias/dia_013/dia_013_capa.png"
draft: true
---
Deslocar os bits de um número para a esquerda ou para a direita parece uma operação simples, e é uma das mais úteis do hardware: multiplica e divide por potências de 2, separa campos de um pacote de dados, alinha números em ponto flutuante. Hoje construímos o **deslocador barrel** (*barrel shifter*), que desloca um número **qualquer quantidade** de posições em **um único passo**, usando apenas multiplexadores.

---

## Descrição

O deslocador recebe um dado `in_a` de `WIDTH` bits e uma quantidade `shamt` (*shift amount*) de 0 a `WIDTH-1`, e faz uma de três operações:

- **Lógico à esquerda** (`<<`): os bits andam para a esquerda e entram **zeros** pela direita. Deslocar `n` posições à esquerda **multiplica por 2ⁿ** (desde que nada útil "caia" pela esquerda).
- **Lógico à direita** (`>>`): os bits andam para a direita e entram **zeros** pela esquerda. Para números sem sinal, isso **divide por 2ⁿ**, descartando o resto.
- **Aritmético à direita** (`>>>`): entra pela esquerda uma cópia do **bit de sinal**. Assim, um número negativo continua negativo, e o deslocamento divide por 2ⁿ também para números **com sinal**: `-16 >>> 2 = -4`.

Não existe "aritmético à esquerda" diferente do lógico: nos dois casos entram zeros pela direita.

### Por que "barrel"?

O jeito ingênuo de deslocar `n` posições seria deslocar uma posição por vez, `n` vezes. O deslocador barrel faz tudo de uma vez com uma ideia esperta: escrever `n` em binário. Com 8 bits, `shamt` tem 3 bits, e qualquer deslocamento de 0 a 7 é uma soma de **1, 2 e 4**:

```text
shamt = 5 = 101  ->  desloca 4 (bit 2 = 1) + 0 (bit 1 = 0) + 1 (bit 0 = 1)
```

Então o circuito tem **log₂(WIDTH) estágios**: o estágio `k` desloca `2^k` posições se `shamt[k] = 1`, ou deixa o dado passar se `shamt[k] = 0`. Cada estágio é só uma fileira de **muxes 2x1** (Dia 003), um por bit. Com 8 bits, são 3 estágios de 8 muxes; com 64 bits, 6 estágios de 64 muxes.

E o deslocamento à esquerda? Usamos um truque: **inverter a ordem dos bits**, deslocar à direita e inverter de novo. Deslocar à esquerda é exatamente deslocar à direita "olhando no espelho". Assim, o mesmo hardware faz as três operações.

## Diagrama de Blocos

![Diagrama de blocos do deslocador](/assets/images/100dias/dia_013/dia_013_diagrama_blocos.png)

| Sinal   | Direção | Largura        | Descrição                                   |
|---------|---------|----------------|---------------------------------------------|
| `in_a`  | entrada | WIDTH          | Dado de entrada                             |
| `shamt` | entrada | log₂(WIDTH)    | Quantidade de posições                      |
| `dir`   | entrada | 1 bit          | Direção: `0` = esquerda, `1` = direita      |
| `arith` | entrada | 1 bit          | À direita: `0` = lógico, `1` = aritmético   |
| `out`   | saída   | WIDTH          | Dado deslocado                              |

## Tabela Verdade

Com 8 bits de dado, 3 de `shamt` e 2 de controle, seriam 8.192 linhas. A tabela abaixo mostra o que cada operação faz com o mesmo dado, `1011 0011`, deslocado 3 posições:

![As três operações do deslocador](/assets/images/100dias/dia_013/dia_013_tabela_verdade.png)

Repare na diferença entre as duas operações à direita: o lógico preenche com `000`, e o aritmético repete o bit de sinal (`1`) e preenche com `111`. Lido com sinal, `1011 0011` é **-77**, e `1111 0110` é **-10**: `-77 / 8 = -9,625`, arredondado para baixo (em direção a -∞) dá -10.

## Expressões

![O que cada deslocamento calcula](/assets/images/100dias/dia_013/dia_013_expressao_booleana.png)

A última linha descreve um deslocamento à direita bit a bit: cada bit da saída é o bit `n` posições à esquerda na entrada, ou o bit de preenchimento (`fill`) se essa posição não existe.

## Diagrama de Circuito

O deslocador barrel de 8 bits. No meio, a rede de 3 estágios desloca à direita; em cima e embaixo, os muxes que invertem a ordem dos bits quando `dir = 0`:

![Deslocador barrel de 8 bits](/assets/images/100dias/dia_013/dia_013_diagrama_circuito.png)

Em cada mux, a entrada `0` vem da mesma coluna (não desloca) e a entrada `1` vem da coluna `2^k` posições à esquerda (desloca). Nas colunas da esquerda, onde não existe bit para trazer, entra o `fill`: `0` no deslocamento lógico, ou o bit de sinal no aritmético.

Todos os caminhos passam por exatamente **3 muxes** (mais os da inversão): o atraso não depende de quanto deslocamos.

---

## Código Verilog

```verilog
// ============================================================================
// VLSI Brasil - 100 Dias de RTL
// Dia 013 - Deslocador Barrel (Barrel Shifter)
// ----------------------------------------------------------------------------
// Descrição : Desloca in_a de 0 a WIDTH-1 posições em um único passo.
//             dir = 0 -> deslocamento lógico à esquerda   (<<)
//             dir = 1 -> deslocamento à direita:
//                        arith = 0 -> lógico, entra 0      (>>)
//                        arith = 1 -> aritmético, repete o
//                                     bit de sinal         (>>>)
//             Estrutura logarítmica: log2(WIDTH) estágios de muxes 2x1; o
//             estágio k desloca 2^k posições quando shamt[k] = 1. O
//             deslocamento à esquerda usa o mesmo hardware, invertendo a
//             ordem dos bits na entrada e na saída.
// ============================================================================

`timescale 1ns / 1ps

module deslocador #(
    parameter WIDTH = 8,                            // largura dos dados
    parameter SW    = $clog2(WIDTH)                 // largura de shamt
) (
    input  wire [WIDTH-1:0] in_a,                   // dado de entrada
    input  wire [SW-1:0]    shamt,                  // quantidade (shift amount)
    input  wire             dir,                    // 0: esquerda, 1: direita
    input  wire             arith,                  // 1: aritmético (direita)
    output wire [WIDTH-1:0] out                     // dado deslocado
);

    // Inverte a ordem dos bits: o bit 0 vira o bit WIDTH-1 e vice-versa
    function [WIDTH-1:0] inverte(input [WIDTH-1:0] v);
        integer i;
        begin
            for (i = 0; i < WIDTH; i = i + 1)
                inverte[i] = v[WIDTH-1-i];
        end
    endfunction

    // Bit que entra pela esquerda: o sinal (aritmético) ou 0 (lógico)
    wire fill = dir & arith & in_a[WIDTH-1];

    // estagio[k]: dado depois dos k primeiros estágios
    wire [WIDTH-1:0] estagio [0:SW];

    // À esquerda: inverte, desloca à direita e inverte de volta
    assign estagio[0] = dir ? in_a : inverte(in_a);

    genvar k;
    generate
        for (k = 0; k < SW; k = k + 1) begin : g_estagio
            // Desloca 2^k posições à direita se shamt[k] = 1 (um mux 2x1 por bit)
            assign estagio[k+1] = shamt[k]
                ? {{(1 << k){fill}}, estagio[k][WIDTH-1:(1 << k)]}
                : estagio[k];
        end
    endgenerate

    assign out = dir ? estagio[SW] : inverte(estagio[SW]);

endmodule
```

O que há de novo aqui:

- **Parâmetro calculado a partir de outro**: `parameter SW = $clog2(WIDTH)` define a largura de `shamt` a partir de `WIDTH`. Quem instancia o módulo só precisa informar `WIDTH`.
- **`function`**: `inverte` é uma **função**, um trecho de lógica combinacional reutilizável que recebe argumentos e devolve um valor (pelo próprio nome da função). Ela pode ser chamada em qualquer expressão, como `inverte(in_a)`. Diferente de um módulo, uma função não tem portas nem instância: o código dela é "colado" onde ela é chamada.
- **`for` dentro de uma função**: o laço percorre os bits e é desenrolado na síntese. Não vira um circuito que "repete": vira `WIDTH` fios cruzados, sem nenhuma porta lógica.
- **Replicação com tamanho calculado**: `{(1 << k){fill}}` repete o bit `fill` `2^k` vezes, para preencher as posições que ficaram vazias no estágio `k`.
- **Seleção de partes com expressões**: `estagio[k][WIDTH-1:(1 << k)]` pega os bits que sobram depois de deslocar `2^k` posições. Os limites podem ser expressões, desde que sejam **constantes** na elaboração (aqui, `k` é um `genvar`).

> **Na prática:** o Verilog já tem os operadores `<<`, `>>` e `>>>`, e em um projeto real escrevemos `assign out = in_a >> shamt;`. A síntese gera um deslocador barrel como o nosso. Para `>>>`, o operando precisa ser **com sinal** (`$signed(in_a) >>> shamt`); com um vetor sem sinal, `>>>` se comporta como `>>`, outra armadilha comum.

## Testbench

```verilog
// ============================================================================
// VLSI Brasil - 100 Dias de RTL
// Dia 013 - Testbench do Deslocador
// ============================================================================

`timescale 1ns / 1ps

module tb_deslocador;

    parameter WIDTH = 8;
    localparam SW = $clog2(WIDTH);

    // Sinais do testbench
    reg  [WIDTH-1:0] in_a;
    reg  [SW-1:0]    shamt;
    reg              dir, arith;
    wire [WIDTH-1:0] out;

    reg  [WIDTH-1:0] esperado;

    integer i;
    integer testes = 0;
    integer erros  = 0;

    // Instância do circuito sob teste (DUT - Device Under Test)
    deslocador #(.WIDTH(WIDTH)) dut (
        .in_a  (in_a),
        .shamt (shamt),
        .dir   (dir),
        .arith (arith),
        .out   (out)
    );

    // Modelo de referência: os operadores de deslocamento do Verilog
    task verifica;
        begin
            if (!dir)
                esperado = in_a << shamt;
            else if (arith)
                esperado = $signed(in_a) >>> shamt;
            else
                esperado = in_a >> shamt;
            testes = testes + 1;
            if (out !== esperado) begin
                $display("ERRO: in=%b shamt=%0d dir=%b arith=%b -> out=%b, esperado %b",
                         in_a, shamt, dir, arith, out, esperado);
                erros = erros + 1;
            end
        end
    endtask

    // Aplica um teste dirigido, espera 10 ns e mostra o resultado
    task aplica(input [WIDTH-1:0] a, input [SW-1:0] s, input d, input ar);
        begin
            in_a = a; shamt = s; dir = d; arith = ar;
            #10;
            $display(" %t | %b  %0d  %s | %b", $time, in_a, shamt,
                     !dir ? "<<  " : (arith ? ">>> " : ">>  "), out);
            verifica;
        end
    endtask

    initial begin
        // Arquivo de formas de onda para o GTKWave
        $dumpfile("tb_deslocador.vcd");
        $dumpvars(0, tb_deslocador);

        // Exibe o tempo em ns
        $timeformat(-9, 0, " ns", 6);

        $display("WIDTH = %0d", WIDTH);
        $display("---------------------------------------");
        $display(" tempo  | in_a     sh op   | out");
        $display("---------------------------------------");

        // Parte 1: testes dirigidos (aparecem nas formas de onda)
        aplica(8'b1011_0011, 0, 0, 0);      // sem deslocamento
        aplica(8'b1011_0011, 1, 0, 0);      // << 1 (multiplica por 2)
        aplica(8'b1011_0011, 3, 0, 0);      // << 3
        aplica(8'b1011_0011, 3, 1, 0);      // >> 3 lógico: entram zeros
        aplica(8'b1011_0011, 3, 1, 1);      // >>> 3 aritmético: repete o sinal
        aplica(8'b0011_0011, 3, 1, 1);      // >>> com número positivo
        aplica(8'b1000_0000, 7, 1, 1);      // >>> 7: só sobra o sinal

        // Parte 2: testes fora das formas de onda
        $dumpoff;
        if (WIDTH <= 8) begin
            // Teste exaustivo: dado x quantidade x operação
            for (i = 0; i < (1 << (WIDTH + SW + 2)); i = i + 1) begin
                {in_a, shamt, dir, arith} = i;
                #10;
                verifica;
            end
        end else begin
            // 1000 testes aleatórios
            for (i = 0; i < 1000; i = i + 1) begin
                in_a  = {$random, $random};
                shamt = $random;
                {dir, arith} = $random;
                #10;
                verifica;
            end
        end

        $display("---------------------------------------");
        if (erros == 0)
            $display("SUCESSO: %0d testes passaram!", testes);
        else
            $display("FALHA: %0d erro(s) em %0d testes.", erros, testes);

        $finish;
    end

endmodule
```

O modelo de referência usa os operadores do Verilog, inclusive `$signed(in_a) >>> shamt` para o deslocamento aritmético. O teste exaustivo percorre os 256 dados × 8 quantidades × 4 combinações de `dir` e `arith` = **8.192** casos.

---

## Simulação

### Diagrama de tempo esperado

![Diagrama de tempo esperado](/assets/images/100dias/dia_013/dia_013_diagrama_tempo_esperado.png)

### Rodando no Icarus Verilog

```bash
# compila o projeto e o testbench
iverilog -g2012 -Wall -o tb_deslocador.vvp rtl/deslocador.v rtl/tb_deslocador.v

# executa a simulação
vvp tb_deslocador.vvp
```

A saída no terminal:

```text
VCD info: dumpfile tb_deslocador.vcd opened for output.
WIDTH = 8
---------------------------------------
 tempo  | in_a     sh op   | out
---------------------------------------
  10 ns | 10110011  0  <<   | 10110011
  20 ns | 10110011  1  <<   | 01100110
  30 ns | 10110011  3  <<   | 10011000
  40 ns | 10110011  3  >>   | 00010110
  50 ns | 10110011  3  >>>  | 11110110
  60 ns | 00110011  3  >>>  | 00000110
  70 ns | 10000000  7  >>>  | 11111111
---------------------------------------
SUCESSO: 8199 testes passaram!
```

O último teste mostra bem o deslocamento aritmético: `1000 0000` (-128) deslocado 7 posições vira `1111 1111` (-1), pois só sobra o bit de sinal, repetido.

Com 32 bits (5 estágios):

```bash
iverilog -g2012 -Wall -P tb_deslocador.WIDTH=32 -o tb_deslocador.vvp rtl/deslocador.v rtl/tb_deslocador.v
vvp tb_deslocador.vvp
```

```text
WIDTH = 32
SUCESSO: 1007 testes passaram!
```

### Formas de onda no GTKWave

```bash
gtkwave tb_deslocador.vcd
```

![Resultado da simulação no GTKWave](/assets/images/100dias/dia_013/dia_013_simulacao_gtkwave.png)

Os dados estão em binário, para ver os bits andando. Compare as janelas de 30 a 40 ns (`>>`, entram zeros) e de 40 a 50 ns (`>>>`, entram uns).

---

## Resumo

- O deslocador move os bits de um número: `<<` e `>>` preenchem com zeros, `>>>` repete o bit de sinal.
- Deslocar `n` posições multiplica (`<<`) ou divide (`>>`, `>>>`) por 2ⁿ.
- O **deslocador barrel** usa log₂(WIDTH) estágios de muxes 2x1; o estágio `k` desloca `2^k` posições quando `shamt[k] = 1`.
- O deslocamento à esquerda reaproveita o hardware: inverte, desloca à direita e inverte de novo.
- Em Verilog: `function`, parâmetro calculado com `$clog2`, replicação com tamanho calculado e os operadores `<<`, `>>`, `>>>` (este último só funciona com `$signed`).

No **Dia 014** vamos fazer os bits que "caem" de um lado voltarem pelo outro: o **rotacionador**. Até amanhã!
