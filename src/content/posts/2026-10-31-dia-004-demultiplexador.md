---
title: "Dia 004 - Demultiplexador"
description: "Dia 004 do Desafio 100 Dias de RTL: o demultiplexador 1x4 parametrizável, com expressões booleanas, circuito em portas lógicas, código Verilog, testbench e simulação no Icarus Verilog e GTKWave."
date: 2026-10-31
author: rafael
categories: ["100 Dias de RTL", "Verilog"]
tags: ["RTL", "Verilog", "Demultiplexador", "Icarus Verilog", "GTKWave"]
cover: "/assets/images/100dias/dia_004/dia_004_capa.png"
draft: true
---
Ontem construímos o multiplexador, que escolhe **uma entre várias entradas**. Hoje vamos fazer o caminho inverso com o **demultiplexador** (ou **demux**), que pega **uma entrada** e a envia para **uma entre várias saídas**.

---

## Descrição

Se o multiplexador é uma chave seletora, o demultiplexador é um **distribuidor**: o sinal de seleção `sel` escolhe para qual saída o dado de entrada `in_a` vai ser encaminhado. As saídas que não foram selecionadas ficam em `0`.

O nosso demux **1x4** (1 entrada, 4 saídas) usa 2 bits de seleção:

- `sel = 00` → `out_0 = in_a` (as demais saídas em `0`)
- `sel = 01` → `out_1 = in_a`
- `sel = 10` → `out_2 = in_a`
- `sel = 11` → `out_3 = in_a`

Demultiplexadores aparecem sempre que um recurso precisa ser **distribuído**: enviar um dado para um entre vários registradores, gerar o sinal de habilitação de escrita (*write enable*) de cada palavra de uma memória, ou rotear pacotes para diferentes destinos.

Um detalhe interessante: se a entrada `in_a` for fixa em `1`, o demux vira um **decodificador** (*decoder*) 2→4, que ativa exatamente uma saída para cada valor de `sel`. Vamos estudar decodificadores mais à frente no desafio.

Assim como no Dia 003, os dados são **barramentos de 4 bits** com largura parametrizável.

## Diagrama de Blocos

![Diagrama de blocos do demultiplexador 1x4](/assets/images/100dias/dia_004/dia_004_diagrama_blocos.png)

| Sinal   | Direção | Largura | Descrição                              |
|---------|---------|---------|----------------------------------------|
| `in_a`  | entrada | 4 bits  | Dado de entrada                        |
| `sel`   | entrada | 2 bits  | Seleção da saída                       |
| `out_0` | saída   | 4 bits  | Recebe `in_a` quando `sel = 00`        |
| `out_1` | saída   | 4 bits  | Recebe `in_a` quando `sel = 01`        |
| `out_2` | saída   | 4 bits  | Recebe `in_a` quando `sel = 10`        |
| `out_3` | saída   | 4 bits  | Recebe `in_a` quando `sel = 11`        |

## Tabela Verdade

Como no multiplexador, usamos a forma compacta, com as saídas escritas em função da entrada:

![Tabela verdade do demultiplexador 1x4](/assets/images/100dias/dia_004/dia_004_tabela_verdade.png)

## Expressões Booleanas

Cada saída é o dado de entrada "liberado" por um termo AND que só vale `1` para a sua combinação de `sel` (os mesmos termos que apareceram no mux 4x1):

![Expressões booleanas do demultiplexador](/assets/images/100dias/dia_004/dia_004_expressao_booleana.png)

## Diagrama de Circuito

As expressões viram um circuito com **dois inversores** (que geram `sel[1]'` e `sel[0]'`) e **quatro portas AND de três entradas**, uma por saída. As linhas verticais formam um "barramento" com os sinais e seus complementos, e cada AND pega a combinação que lhe interessa (os pontos indicam as conexões):

![Demultiplexador 1x4 (1 bit) com portas lógicas](/assets/images/100dias/dia_004/dia_004_demux_portas.png)

O diagrama mostra a versão de 1 bit. Para 4 bits, o circuito é simplesmente repetido para cada bit de `in_a`, compartilhando os inversores e a seleção.

---

## Código Verilog

Desta vez usamos **atribuições contínuas** com o operador ternário: cada saída recebe `in_a` se for a selecionada, ou zero caso contrário.

```verilog
// ============================================================================
// VLSI Brasil - Desafio 100 Dias de RTL
// Dia 004 - Demultiplexador 1x4
// ----------------------------------------------------------------------------
// Descrição : Encaminha a entrada in_a (WIDTH bits) para uma de quatro saídas,
//             de acordo com o sinal de seleção sel. As demais saídas ficam
//             em zero.
//             sel = 00 -> out_0 | 01 -> out_1 | 10 -> out_2 | 11 -> out_3
// ============================================================================

`timescale 1ns / 1ps

module demux_1x4 #(
    parameter WIDTH = 4                 // largura dos dados
) (
    input  wire [WIDTH-1:0] in_a,       // entrada de dados
    input  wire [1:0]       sel,        // seleção
    output wire [WIDTH-1:0] out_0,      // saída 0
    output wire [WIDTH-1:0] out_1,      // saída 1
    output wire [WIDTH-1:0] out_2,      // saída 2
    output wire [WIDTH-1:0] out_3       // saída 3
);

    // Cada saída recebe in_a somente quando é a selecionada
    assign out_0 = (sel == 2'b00) ? in_a : {WIDTH{1'b0}};
    assign out_1 = (sel == 2'b01) ? in_a : {WIDTH{1'b0}};
    assign out_2 = (sel == 2'b10) ? in_a : {WIDTH{1'b0}};
    assign out_3 = (sel == 2'b11) ? in_a : {WIDTH{1'b0}};

endmodule
```

O que há de novo aqui:

- **`(condição) ? valor_se_verdadeiro : valor_se_falso`**: o operador ternário, que em hardware vira justamente um mux 2x1.
- **`{WIDTH{1'b0}}`**: o operador de **replicação**. Ele repete o valor `1'b0` WIDTH vezes, gerando um zero com a largura certa para qualquer valor do parâmetro (para `WIDTH = 4`, equivale a `4'b0000`).
- Como cada saída é uma atribuição contínua independente, **não existe risco de latch** aqui: toda saída sempre tem um valor definido.

> **Alternativa com `always`:** o mesmo circuito pode ser escrito com `always @(*)` e `case`. Nesse caso, é fundamental atribuir um valor padrão (zero) a **todas** as saídas no início do bloco, antes do `case`. Caso contrário, as saídas não selecionadas ficariam sem valor e a síntese inferiria latches.

## Testbench

O testbench segue a mesma estrutura do Dia 003: testes dirigidos que aparecem nas formas de onda e testes aleatórios verificados em silêncio.

```verilog
// ============================================================================
// VLSI Brasil - Desafio 100 Dias de RTL
// Dia 004 - Testbench do Demultiplexador 1x4
// ============================================================================

`timescale 1ns / 1ps

module tb_demux_1x4;

    localparam WIDTH = 4;

    // Sinais do testbench
    reg  [WIDTH-1:0] in_a;
    reg  [1:0]       sel;
    wire [WIDTH-1:0] out_0, out_1, out_2, out_3;

    reg  [4*WIDTH-1:0] esperado;

    integer i, j;
    integer erros = 0;

    // Instância do circuito sob teste (DUT - Device Under Test)
    demux_1x4 #(.WIDTH(WIDTH)) dut (
        .in_a  (in_a),
        .sel   (sel),
        .out_0 (out_0),
        .out_1 (out_1),
        .out_2 (out_2),
        .out_3 (out_3)
    );

    // Modelo de referência: in_a deslocada para a posição de sel
    // dentro do vetor {out_3, out_2, out_1, out_0}
    task verifica;
        begin
            esperado = in_a << (sel * WIDTH);
            if ({out_3, out_2, out_1, out_0} !== esperado) begin
                $display("ERRO: in_a=%h sel=%0d -> {%h,%h,%h,%h}, esperado %h",
                         in_a, sel, out_3, out_2, out_1, out_0, esperado);
                erros = erros + 1;
            end
        end
    endtask

    initial begin
        // Arquivo de formas de onda para o GTKWave
        $dumpfile("tb_demux_1x4.vcd");
        $dumpvars(0, tb_demux_1x4);

        // Exibe o tempo em ns
        $timeformat(-9, 0, " ns", 6);

        $display("---------------------------------------------");
        $display(" tempo  | in_a | sel | out_0 out_1 out_2 out_3");
        $display("---------------------------------------------");

        // Parte 1: testes dirigidos (aparecem nas formas de onda)
        for (i = 0; i < 2; i = i + 1) begin
            in_a = (i == 0) ? 4'hA : 4'h5;
            for (j = 0; j < 4; j = j + 1) begin
                sel = j[1:0];
                #10;
                $display(" %t |  %h   |  %0d  |   %h     %h     %h     %h",
                         $time, in_a, sel, out_0, out_1, out_2, out_3);
                verifica;
            end
        end

        // Parte 2: 1000 testes aleatórios (fora das formas de onda)
        $dumpoff;
        for (i = 0; i < 1000; i = i + 1) begin
            {in_a, sel} = $random;
            #10;
            verifica;
        end

        $display("---------------------------------------------");
        if (erros == 0)
            $display("SUCESSO: todos os testes passaram!");
        else
            $display("FALHA: %0d erro(s) encontrado(s).", erros);

        $finish;
    end

endmodule
```

O **modelo de referência** é bem compacto: `in_a << (sel * WIDTH)` desloca o dado para a "fatia" correspondente à saída selecionada dentro do vetor `{out_3, out_2, out_1, out_0}`, deixando todas as outras fatias em zero. Comparando esse vetor de 16 bits com as quatro saídas concatenadas, verificamos de uma vez que a saída certa recebeu o dado **e** que as outras ficaram zeradas.

---

## Simulação

### Diagrama de tempo esperado

O dado fica parado (`A` e depois `5`) enquanto `sel` percorre `0, 1, 2, 3`. Repare como o dado "caminha" de uma saída para a próxima:

![Diagrama de tempo esperado](/assets/images/100dias/dia_004/dia_004_diagrama_tempo_esperado.png)

### Rodando no Icarus Verilog

```bash
# compila o projeto e o testbench
iverilog -g2012 -Wall -o tb_demux_1x4.vvp rtl/demux_1x4.v rtl/tb_demux_1x4.v

# executa a simulação
vvp tb_demux_1x4.vvp
```

A saída no terminal (os 1000 testes aleatórios são verificados sem imprimir nada):

```text
VCD info: dumpfile tb_demux_1x4.vcd opened for output.
---------------------------------------------
 tempo  | in_a | sel | out_0 out_1 out_2 out_3
---------------------------------------------
  10 ns |  a   |  0  |   a     0     0     0
  20 ns |  a   |  1  |   0     a     0     0
  30 ns |  a   |  2  |   0     0     a     0
  40 ns |  a   |  3  |   0     0     0     a
  50 ns |  5   |  0  |   5     0     0     0
  60 ns |  5   |  1  |   0     5     0     0
  70 ns |  5   |  2  |   0     0     5     0
  80 ns |  5   |  3  |   0     0     0     5
---------------------------------------------
SUCESSO: todos os testes passaram!
```

### Formas de onda no GTKWave

```bash
gtkwave tb_demux_1x4.vcd
```

![Resultado da simulação no GTKWave](/assets/images/100dias/dia_004/dia_004_simulacao_gtkwave.png)

O comportamento é exatamente o esperado: a cada 10 ns, apenas a saída indicada por `sel` recebe o valor de `in_a`. Assim como no Dia 003, a imagem mostra o trecho de 0 a 80 ns, antes do `$dumpoff`.

---

## Resumo

- O demultiplexador encaminha uma entrada para uma de N saídas, escolhida por log₂(N) bits de seleção; as outras saídas ficam em `0`.
- Cada saída é `in_a` AND (a combinação de `sel` daquela saída).
- Um demux com a entrada fixa em `1` é um decodificador.
- Em Verilog: `assign` com o operador ternário e a replicação `{WIDTH{1'b0}}` para gerar zeros parametrizáveis.

No **Dia 005** começamos a fazer contas: vamos construir o **meio somador** (*half adder*), o primeiro passo para os circuitos aritméticos. Até amanhã!
