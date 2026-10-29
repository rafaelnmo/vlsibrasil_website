---
title: "Dia 014 - Rotacionador (Barrel Rotator)"
description: "Dia 014 do 100 Dias de RTL: o rotacionador barrel, que gira os bits nas duas direções usando o complemento de dois da quantidade de rotação."
date: 2026-11-10
author: rafael
categories: ["100 Dias de RTL", "Verilog"]
tags: ["RTL", "Verilog", "Rotacionador", "Barrel Shifter", "Icarus Verilog", "GTKWave"]
cover: "/assets/images/100dias/dia_014/dia_014_capa.png"
draft: true
---
Ontem, no deslocador, os bits que saíam por um lado eram **descartados**, e entravam zeros (ou o sinal) pelo outro. Hoje nenhum bit se perde: no **rotacionador**, o que sai por um lado **volta pelo outro**, como se o número fosse um anel. Rotações aparecem em criptografia (AES, SHA-256 e ChaCha usam rotações o tempo todo), em funções de hash, em códigos de verificação como o CRC e em instruções de processadores (`rol`/`ror` no x86, `rori` no RISC-V).

---

## Descrição

O rotacionador recebe um dado `in_a` de `WIDTH` bits, uma quantidade `shamt` e uma direção `dir`:

- **`dir = 0`**, rotação à **esquerda**: cada bit anda `shamt` posições para a esquerda, e os bits que saem pelo MSB entram pelo LSB.
- **`dir = 1`**, rotação à **direita**: o contrário, os bits que saem pelo LSB entram pelo MSB.

```text
rotação à esquerda de 1 posição:
  1000 0110
  ↙         ↘ (o 1 do MSB dá a volta)
  0000 1101
```

Duas propriedades deixam o circuito simples:

1. **Rotacionar `WIDTH` posições não muda nada**: os bits dão a volta completa. Por isso só faz sentido rotacionar de 0 a `WIDTH-1`.
2. **Rotacionar `n` à esquerda é o mesmo que rotacionar `WIDTH - n` à direita**. Com 8 bits, girar 3 posições para a esquerda chega no mesmo lugar que girar 5 para a direita.

A segunda propriedade nos deixa usar **um único** circuito, que só rotaciona à direita. E calcular `WIDTH - n` é fácil: com `WIDTH = 8` e `shamt` de 3 bits, `8 - n` é exatamente o **complemento de dois** de `n` (Dia 011), porque a conta "dá a volta" em 3 bits:

```text
n = 3 = 011  ->  -n = ~011 + 1 = 100 + 1 = 101 = 5    (e 8 - 3 = 5)
n = 0 = 000  ->  -n = ~000 + 1 = 111 + 1 = 000 = 0    (8 - 0 = 8, que equivale a 0)
```

## Diagrama de Blocos

![Diagrama de blocos do rotacionador](/assets/images/100dias/dia_014/dia_014_diagrama_blocos.png)

| Sinal   | Direção | Largura        | Descrição                                   |
|---------|---------|----------------|---------------------------------------------|
| `in_a`  | entrada | WIDTH          | Dado de entrada                             |
| `shamt` | entrada | log₂(WIDTH)    | Quantidade de posições                      |
| `dir`   | entrada | 1 bit          | Direção: `0` = esquerda, `1` = direita      |
| `out`   | saída   | WIDTH          | Dado rotacionado                            |

## Tabela Verdade

Todas as rotações do mesmo dado, `1000 0110`, nas duas direções:

![Todas as rotações de 1000 0110](/assets/images/100dias/dia_014/dia_014_tabela_verdade.png)

Compare as colunas: a rotação de `n` à esquerda aparece na coluna da direita na linha `8 - n`. Por exemplo, esquerda 3 = `0011 0100` = direita 5. E, ao contrário do deslocador, **nenhum bit some**: toda linha tem os mesmos três `1`s.

## Expressões

![Rotação escrita com deslocamentos](/assets/images/100dias/dia_014/dia_014_expressao_booleana.png)

- Uma rotação é a combinação de **dois deslocamentos**: os bits que andam (`x >> n`) e os que dão a volta (`x << (8 - n)`), juntados por uma OR. Como os dois deslocamentos ocupam posições diferentes, a OR só junta as partes.
- A rotação à esquerda é a rotação à direita com `8 - n` posições.
- E `8 - n`, com 3 bits, é o complemento de dois de `n`.

## Diagrama de Circuito

O rotacionador barrel de 8 bits. A estrutura é a mesma do deslocador de ontem, com uma diferença: nas colunas da esquerda, em vez do `fill`, a entrada `1` de cada mux recebe os bits que **saíram pela direita** (fios laranja):

![Rotacionador barrel de 8 bits](/assets/images/100dias/dia_014/dia_014_diagrama_circuito.png)

Os muxes de cada estágio são selecionados por `amt`, que já vem convertido para uma rotação à direita. Comparado ao deslocador, o rotacionador é até mais simples: não precisa inverter a ordem dos bits nem calcular o `fill`; basta um subtrator de 3 bits (`-shamt`) e um mux para escolher a quantidade.

---

## Código Verilog

```verilog
// ============================================================================
// VLSI Brasil - 100 Dias de RTL
// Dia 014 - Rotacionador Barrel (Barrel Rotator)
// ----------------------------------------------------------------------------
// Descrição : Rotaciona in_a de 0 a WIDTH-1 posições em um único passo.
//             dir = 0 -> rotação à esquerda (o bit que sai pela esquerda
//                        volta pela direita)
//             dir = 1 -> rotação à direita
//             Estrutura logarítmica: log2(WIDTH) estágios de muxes 2x1 que
//             rotacionam à direita. Rotacionar n posições à esquerda é o mesmo
//             que rotacionar WIDTH - n à direita, e WIDTH - n é o complemento
//             de dois de n (com SW bits). WIDTH deve ser potência de 2.
// ============================================================================

`timescale 1ns / 1ps

module rotacionador #(
    parameter WIDTH = 8,                            // largura (potência de 2)
    parameter SW    = $clog2(WIDTH)                 // largura de shamt
) (
    input  wire [WIDTH-1:0] in_a,                   // dado de entrada
    input  wire [SW-1:0]    shamt,                  // quantidade de posições
    input  wire             dir,                    // 0: esquerda, 1: direita
    output wire [WIDTH-1:0] out                     // dado rotacionado
);

    // Quantidade de rotação à direita: n, ou -n = WIDTH - n para a esquerda
    wire [SW-1:0] amt = dir ? shamt : -shamt;

    // estagio[k]: dado depois dos k primeiros estágios
    wire [WIDTH-1:0] estagio [0:SW];

    assign estagio[0] = in_a;

    genvar k;
    generate
        for (k = 0; k < SW; k = k + 1) begin : g_estagio
            // Rotaciona 2^k posições à direita se amt[k] = 1: os 2^k bits
            // que saem pela direita voltam pela esquerda
            assign estagio[k+1] = amt[k]
                ? {estagio[k][(1 << k)-1:0], estagio[k][WIDTH-1:(1 << k)]}
                : estagio[k];
        end
    endgenerate

    assign out = estagio[SW];

endmodule
```

O que há de novo aqui:

- **Menos unário com largura fixa**: `-shamt` calcula o complemento de dois de `shamt`. Como `amt` tem `SW` bits, o resultado "dá a volta" módulo `2^SW`, que é exatamente `WIDTH - shamt` (módulo `WIDTH`). Esse truque só funciona porque `WIDTH` é potência de 2; por isso o comentário do módulo exige isso.
- **Concatenação que dá a volta**: `{estagio[k][(1 << k)-1:0], estagio[k][WIDTH-1:(1 << k)]}` coloca os `2^k` bits de baixo em cima e os demais embaixo. É a rotação de um estágio escrita diretamente com fios.
- **Sem lógica nenhuma além dos muxes**: um rotacionador é só fios cruzados e muxes. A rotação por uma quantidade **fixa** nem precisa de mux: `{x[2:0], x[7:3]}` é uma rotação de 3 à direita feita só com fios, sem nenhuma porta.

## Testbench

```verilog
// ============================================================================
// VLSI Brasil - 100 Dias de RTL
// Dia 014 - Testbench do Rotacionador
// ============================================================================

`timescale 1ns / 1ps

module tb_rotacionador;

    parameter WIDTH = 8;
    localparam SW = $clog2(WIDTH);

    // Sinais do testbench
    reg  [WIDTH-1:0] in_a;
    reg  [SW-1:0]    shamt;
    reg              dir;
    wire [WIDTH-1:0] out;

    reg  [2*WIDTH-1:0] dobro;           // {in_a, in_a}
    reg  [WIDTH-1:0]   esperado;

    integer i;
    integer testes = 0;
    integer erros  = 0;

    // Instância do circuito sob teste (DUT - Device Under Test)
    rotacionador #(.WIDTH(WIDTH)) dut (
        .in_a  (in_a),
        .shamt (shamt),
        .dir   (dir),
        .out   (out)
    );

    // Modelo de referência: com o dado repetido duas vezes, uma rotação
    // vira um deslocamento comum. À direita, pegamos a metade de baixo;
    // à esquerda, a metade de cima
    task verifica;
        begin
            dobro = {in_a, in_a};
            if (dir)
                esperado = dobro >> shamt;                  // trunca: metade de baixo
            else
                esperado = (dobro << shamt) >> WIDTH;       // metade de cima
            testes = testes + 1;
            if (out !== esperado) begin
                $display("ERRO: in=%b shamt=%0d dir=%b -> out=%b, esperado %b",
                         in_a, shamt, dir, out, esperado);
                erros = erros + 1;
            end
        end
    endtask

    // Aplica um teste dirigido, espera 10 ns e mostra o resultado
    task aplica(input [WIDTH-1:0] a, input [SW-1:0] s, input d);
        begin
            in_a = a; shamt = s; dir = d;
            #10;
            $display(" %t | %b  %0d  %s | %b", $time, in_a, shamt,
                     dir ? "dir" : "esq", out);
            verifica;
        end
    endtask

    initial begin
        // Arquivo de formas de onda para o GTKWave
        $dumpfile("tb_rotacionador.vcd");
        $dumpvars(0, tb_rotacionador);

        // Exibe o tempo em ns
        $timeformat(-9, 0, " ns", 6);

        $display("WIDTH = %0d", WIDTH);
        $display("--------------------------------------");
        $display(" tempo  | in_a     sh rot | out");
        $display("--------------------------------------");

        // Parte 1: testes dirigidos (aparecem nas formas de onda)
        aplica(8'b1000_0110, 0, 1);         // sem rotação
        aplica(8'b1000_0110, 1, 0);         // esquerda 1: o 1 do MSB volta no LSB
        aplica(8'b1000_0110, 3, 0);         // esquerda 3
        aplica(8'b1000_0110, 3, 1);         // direita 3
        aplica(8'b1000_0110, 5, 0);         // esquerda 5 = direita 3
        aplica(8'b1111_0000, 4, 1);         // troca as metades (nibbles)

        // Parte 2: testes fora das formas de onda
        $dumpoff;
        if (WIDTH <= 8) begin
            // Teste exaustivo: dado x quantidade x direção
            for (i = 0; i < (1 << (WIDTH + SW + 1)); i = i + 1) begin
                {in_a, shamt, dir} = i;
                #10;
                verifica;
            end
        end else begin
            // 1000 testes aleatórios
            for (i = 0; i < 1000; i = i + 1) begin
                in_a  = {$random, $random};
                shamt = $random;
                dir   = $random;
                #10;
                verifica;
            end
        end

        $display("--------------------------------------");
        if (erros == 0)
            $display("SUCESSO: %0d testes passaram!", testes);
        else
            $display("FALHA: %0d erro(s) em %0d testes.", erros, testes);

        $finish;
    end

endmodule
```

O modelo de referência usa um truque clássico: **repetir o dado duas vezes**. Em `{in_a, in_a}`, uma rotação vira um deslocamento comum:

```text
{in_a, in_a} = 1000 0110 1000 0110
>> 3         = 0001 0000 1101 0000   -> metade de baixo: 1101 0000 (direita 3)
<< 3         = 0011 0100 0011 0000   -> metade de cima:  0011 0100 (esquerda 3)
```

Os bits que "saem" de uma cópia entram na outra. Assim, a referência é escrita com os operadores do Verilog, e não com a mesma lógica de muxes do DUT, que é o que queremos de um bom modelo de referência.

---

## Simulação

### Diagrama de tempo esperado

![Diagrama de tempo esperado](/assets/images/100dias/dia_014/dia_014_diagrama_tempo_esperado.png)

### Rodando no Icarus Verilog

```bash
# compila o projeto e o testbench
iverilog -g2012 -Wall -o tb_rotacionador.vvp rtl/rotacionador.v rtl/tb_rotacionador.v

# executa a simulação
vvp tb_rotacionador.vvp
```

A saída no terminal:

```text
VCD info: dumpfile tb_rotacionador.vcd opened for output.
WIDTH = 8
--------------------------------------
 tempo  | in_a     sh rot | out
--------------------------------------
  10 ns | 10000110  0  dir | 10000110
  20 ns | 10000110  1  esq | 00001101
  30 ns | 10000110  3  esq | 00110100
  40 ns | 10000110  3  dir | 11010000
  50 ns | 10000110  5  esq | 11010000
  60 ns | 11110000  4  dir | 00001111
--------------------------------------
SUCESSO: 4102 testes passaram!
```

As linhas de 40 e 50 ns confirmam a propriedade da rotação: direita 3 e esquerda 5 dão o mesmo resultado, `1101 0000`.

Com 32 bits:

```bash
iverilog -g2012 -Wall -P tb_rotacionador.WIDTH=32 -o tb_rotacionador.vvp rtl/rotacionador.v rtl/tb_rotacionador.v
vvp tb_rotacionador.vvp
```

```text
WIDTH = 32
SUCESSO: 1006 testes passaram!
```

### Formas de onda no GTKWave

```bash
gtkwave tb_rotacionador.vcd
```

![Resultado da simulação no GTKWave](/assets/images/100dias/dia_014/dia_014_simulacao_gtkwave.png)

---

## Resumo

- O **rotacionador** desloca os bits sem perder nenhum: o que sai de um lado entra pelo outro.
- Rotacionar `n` à esquerda é o mesmo que rotacionar `WIDTH - n` à direita, e `WIDTH - n` é o complemento de dois de `n` (com `WIDTH` potência de 2).
- O circuito é o deslocador barrel com os fios de "volta" no lugar do preenchimento: log₂(WIDTH) estágios de muxes 2x1.
- Em Verilog: o menos unário que dá a volta na largura do vetor, rotação com concatenação e o truque `{x, x}` para escrever a referência.

No **Dia 015** voltamos à aritmética com o **multiplicador**: vamos multiplicar como fazemos à mão, com produtos parciais e uma fileira de somadores. Até amanhã!
