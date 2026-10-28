---
title: "Dia 005 - Meio Somador"
description: "Dia 005 do Desafio 100 Dias de RTL: o meio somador (half adder), da soma binária ao circuito com XOR e AND, com mapas de Karnaugh, código Verilog, testbench e simulação no Icarus Verilog e GTKWave."
date: 2026-11-01
author: rafael
categories: ["100 Dias de RTL", "Verilog"]
tags: ["RTL", "Verilog", "Aritmética", "Somador", "Icarus Verilog", "GTKWave"]
cover: "/assets/images/100dias/dia_005/dia_005_capa.png"
draft: true
---
Depois de portas lógicas, multiplexadores e demultiplexadores, chegou a hora de fazer contas! Hoje construímos o circuito aritmético mais simples que existe: o **meio somador** (*half adder*), que soma dois bits.

---

## Descrição

Somar em binário funciona como somar em decimal, só que com dois dígitos. Somando dois bits, temos quatro casos:

```text
  0      0      1      1
+ 0    + 1    + 0    + 1
---    ---    ---    ---
 00     01     01     10
```

O último caso é o interessante: `1 + 1 = 2`, que em binário é `10`. O resultado não cabe em 1 bit, então o meio somador tem **duas saídas**:

- **`sum`** (soma): o bit menos significativo do resultado;
- **`carry`** (vai-um): o bit que "vai" para a próxima posição, exatamente como o "vai um" da soma decimal feita à mão.

Ele se chama **meio** somador porque só sabe somar dois bits: ele **não tem uma entrada de vai-um** vinda da posição anterior. Para somar números de vários bits, precisamos do somador completo, que veremos amanhã.

## Diagrama de Blocos

![Diagrama de blocos do meio somador](/assets/images/100dias/dia_005/dia_005_diagrama_blocos.png)

| Sinal   | Direção | Largura | Descrição          |
|---------|---------|---------|--------------------|
| `in_a`  | entrada | 1 bit   | Operando A         |
| `in_b`  | entrada | 1 bit   | Operando B         |
| `sum`   | saída   | 1 bit   | Bit de soma        |
| `carry` | saída   | 1 bit   | Vai-um             |

## Tabela Verdade

Repare que as colunas `carry` e `sum`, lidas juntas, formam o resultado da soma em binário (`00`, `01`, `01`, `10`):

![Tabela verdade do meio somador](/assets/images/100dias/dia_005/dia_005_tabela_verdade.png)

## Mapa de Karnaugh

![Mapas de Karnaugh do meio somador](/assets/images/100dias/dia_005/dia_005_mapa_karnaugh.png)

- **`sum`**: os `1`s formam um padrão de **tabuleiro de xadrez**, sem nenhuma célula vizinha que possa ser agrupada. Esse é o padrão típico da XOR: o mapa não simplifica, e cada `1` vira um termo.
- **`carry`**: só existe um `1`, quando as duas entradas valem `1`. Isso é uma AND.

## Expressões Booleanas

![Expressões booleanas do meio somador](/assets/images/100dias/dia_005/dia_005_expressao_booleana.png)

A soma é `1` quando **exatamente uma** das entradas é `1`, ou seja, quando elas são diferentes. Essa é a definição da XOR que vimos no Dia 002.

## Diagrama de Circuito

O meio somador é simplesmente uma **porta XOR** (para a soma) e uma **porta AND** (para o vai-um), compartilhando as mesmas entradas:

![Circuito do meio somador](/assets/images/100dias/dia_005/dia_005_diagrama_circuito.png)

---

## Código Verilog

```verilog
// ============================================================================
// VLSI Brasil - Desafio 100 Dias de RTL
// Dia 005 - Meio Somador (Half Adder)
// ----------------------------------------------------------------------------
// Descrição : Soma dois bits, gerando o bit de soma (sum) e o bit de
//             "vai-um" (carry).
//             sum   = in_a XOR in_b
//             carry = in_a AND in_b
// ============================================================================

`timescale 1ns / 1ps

module meio_somador (
    input  wire in_a,    // operando A
    input  wire in_b,    // operando B
    output wire sum,     // soma
    output wire carry    // vai-um
);

    assign sum   = in_a ^ in_b;
    assign carry = in_a & in_b;

endmodule
```

O código é uma tradução direta das expressões booleanas. Hoje o circuito é bem simples, mas ele vai virar uma **peça reutilizável**: amanhã vamos instanciar dois meios somadores dentro do somador completo.

> **Alternativa aritmética:** o Verilog também entende o operador `+`. O mesmo meio somador pode ser escrito em uma linha:
> `assign {carry, sum} = in_a + in_b;`
> A concatenação `{carry, sum}` do lado esquerdo forma um vetor de 2 bits que recebe o resultado completo da soma, incluindo o vai-um. Em projetos reais, essa forma é a mais comum, e a ferramenta de síntese escolhe a melhor implementação.

## Testbench

```verilog
// ============================================================================
// VLSI Brasil - Desafio 100 Dias de RTL
// Dia 005 - Testbench do Meio Somador
// ============================================================================

`timescale 1ns / 1ps

module tb_meio_somador;

    // Sinais do testbench
    reg  in_a, in_b;
    wire sum, carry;

    reg  [1:0] esperado;

    integer i;
    integer erros = 0;

    // Instância do circuito sob teste (DUT - Device Under Test)
    meio_somador dut (
        .in_a  (in_a),
        .in_b  (in_b),
        .sum   (sum),
        .carry (carry)
    );

    initial begin
        // Arquivo de formas de onda para o GTKWave
        $dumpfile("tb_meio_somador.vcd");
        $dumpvars(0, tb_meio_somador);

        // Exibe o tempo em ns
        $timeformat(-9, 0, " ns", 6);

        $display("---------------------------------------");
        $display(" tempo  | a b | carry sum | esperado");
        $display("---------------------------------------");

        // Percorre todas as combinações de entrada
        for (i = 0; i < 4; i = i + 1) begin
            {in_a, in_b} = i[1:0];
            #10;

            // Modelo de referência: a soma aritmética de dois bits
            esperado = in_a + in_b;

            $display(" %t | %b %b |   %b    %b  |    %b",
                     $time, in_a, in_b, carry, sum, esperado);

            if ({carry, sum} !== esperado) begin
                $display("ERRO: a=%b b=%b -> {carry,sum}=%b, esperado %b",
                         in_a, in_b, {carry, sum}, esperado);
                erros = erros + 1;
            end
        end

        $display("---------------------------------------");
        if (erros == 0)
            $display("SUCESSO: todos os testes passaram!");
        else
            $display("FALHA: %0d erro(s) encontrado(s).", erros);

        $finish;
    end

endmodule
```

O ponto principal deste testbench é o **modelo de referência**: em vez de escrever a tabela verdade à mão (como no Dia 002), usamos a própria soma aritmética do Verilog, `esperado = in_a + in_b;`. Como `esperado` tem 2 bits, o resultado da soma cabe inteiro, com o vai-um. Depois comparamos com `{carry, sum}`.

Esse é um padrão muito usado na verificação: o DUT é descrito em nível de **portas** (XOR e AND) e o modelo de referência em nível **comportamental** (o operador `+`). Se os dois concordam em todos os casos, ganhamos confiança de que a lógica está certa.

---

## Simulação

### Diagrama de tempo esperado

![Diagrama de tempo esperado](/assets/images/100dias/dia_005/dia_005_diagrama_tempo_esperado.png)

### Rodando no Icarus Verilog

```bash
# compila o projeto e o testbench
iverilog -g2012 -Wall -o tb_meio_somador.vvp rtl/meio_somador.v rtl/tb_meio_somador.v

# executa a simulação
vvp tb_meio_somador.vvp
```

A saída no terminal:

```text
VCD info: dumpfile tb_meio_somador.vcd opened for output.
---------------------------------------
 tempo  | a b | carry sum | esperado
---------------------------------------
  10 ns | 0 0 |   0    0  |    00
  20 ns | 0 1 |   0    1  |    01
  30 ns | 1 0 |   0    1  |    01
  40 ns | 1 1 |   1    0  |    10
---------------------------------------
SUCESSO: todos os testes passaram!
```

### Formas de onda no GTKWave

```bash
gtkwave tb_meio_somador.vcd
```

![Resultado da simulação no GTKWave](/assets/images/100dias/dia_005/dia_005_simulacao_gtkwave.png)

Entre 10 e 30 ns, com uma entrada em `1` e a outra em `0`, temos `sum = 1`. Entre 30 e 40 ns, com as duas em `1`, a soma "transborda": `sum` volta para `0` e `carry` vai para `1`.

---

## Resumo

- O meio somador soma dois bits e gera a soma (`sum`) e o vai-um (`carry`).
- `sum = in_a ⊕ in_b` e `carry = in_a · in_b`: uma XOR e uma AND.
- O padrão de tabuleiro de xadrez no mapa de Karnaugh é a "assinatura" da XOR.
- Ele é "meio" porque não tem entrada de vai-um; por isso não serve sozinho para somar números de vários bits.

No **Dia 006** vamos resolver essa limitação com o **somador completo** (*full adder*), construído a partir de dois meios somadores. Até amanhã!
