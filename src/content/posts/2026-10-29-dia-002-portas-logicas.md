---
title: "Dia 002 - Portas Lógicas"
description: "Dia 002 do 100 Dias de RTL: as portas AND, OR, NAND, NOR, XOR e XNOR, com tabela verdade, NAND e NOR em CMOS, código Verilog, testbench e simulação no Icarus Verilog e GTKWave."
date: 2026-10-29
author: rafael
categories: ["100 Dias de RTL", "Verilog"]
tags: ["RTL", "Verilog", "Portas Lógicas", "CMOS", "Icarus Verilog", "GTKWave"]
cover: "/assets/images/100dias/dia_002/dia_002_capa.png"
draft: true
---
No Dia 001 conhecemos o inversor, a porta lógica de uma entrada. Hoje vamos completar a família com as **seis portas lógicas básicas de duas entradas**: AND, OR, NAND, NOR, XOR e XNOR.

Elas são os "tijolos" de qualquer circuito digital. Somadores, multiplexadores, comparadores, contadores e até processadores inteiros são, no fundo, combinações dessas portas.

---

## Descrição

Cada porta implementa uma função booleana diferente sobre as entradas `in_a` e `in_b`:

| Porta    | A saída é `1` quando...                         |
|----------|-------------------------------------------------|
| **AND**  | **todas** as entradas são `1`                   |
| **OR**   | **pelo menos uma** entrada é `1`                |
| **NAND** | **não** são todas `1` (AND invertida)           |
| **NOR**  | **nenhuma** entrada é `1` (OR invertida)        |
| **XOR**  | as entradas são **diferentes** (OU exclusivo)   |
| **XNOR** | as entradas são **iguais** (XOR invertida)      |

As portas **NAND** e **NOR** são chamadas de **portas universais**: só com NANDs (ou só com NORs) é possível construir qualquer outra função lógica. Por exemplo, um inversor é uma NAND com as duas entradas ligadas juntas. Além disso, como veremos mais abaixo, em CMOS elas são mais simples que a AND e a OR.

A **XOR** merece atenção especial: ela compara dois bits e é a base dos somadores (que veremos nos dias 005 e 006), dos geradores de paridade e dos códigos de detecção de erro.

## Diagrama de Blocos

Para estudar todas as portas de uma vez, nosso bloco tem as duas entradas compartilhadas e uma saída para cada porta:

![Diagrama de blocos das portas lógicas](/assets/images/100dias/dia_002/dia_002_diagrama_blocos.png)

| Sinal      | Direção | Largura | Descrição          |
|------------|---------|---------|--------------------|
| `in_a`     | entrada | 1 bit   | Entrada A          |
| `in_b`     | entrada | 1 bit   | Entrada B          |
| `out_and`  | saída   | 1 bit   | A AND B            |
| `out_or`   | saída   | 1 bit   | A OR B             |
| `out_nand` | saída   | 1 bit   | NOT (A AND B)      |
| `out_nor`  | saída   | 1 bit   | NOT (A OR B)       |
| `out_xor`  | saída   | 1 bit   | A XOR B            |
| `out_xnor` | saída   | 1 bit   | NOT (A XOR B)      |

## Tabela Verdade

Com duas entradas temos 2² = 4 combinações possíveis. Repare como cada porta invertida (NAND, NOR, XNOR) é exatamente o complemento da sua versão "normal":

![Tabela verdade das portas lógicas](/assets/images/100dias/dia_002/dia_002_tabela_verdade.png)

## Expressões Booleanas

Na álgebra booleana, o AND é representado pelo ponto (`·`), o OR pelo `+`, o XOR por `⊕` e a negação por uma barra sobre a expressão:

![Expressões booleanas das portas lógicas](/assets/images/100dias/dia_002/dia_002_expressao_booleana.png)

A XOR também pode ser escrita só com AND, OR e NOT: `in_a ⊕ in_b = in_a'·in_b + in_a·in_b'` (vamos usar essa forma no Dia 005).

## Diagrama de Circuito

Os símbolos das portas seguem um padrão: a **AND** tem o formato de "D", a **OR** tem a parte de trás curva, a **XOR** tem uma curva extra na entrada, e a **bolinha** na saída indica inversão (como no inversor do Dia 001):

![Símbolos das portas lógicas](/assets/images/100dias/dia_002/dia_002_diagrama_circuito.png)

### Por dentro do chip: NAND e NOR em CMOS

Assim como o inversor, as portas CMOS são formadas por uma rede **pull-up** de PMOS (que liga a saída ao VDD) e uma rede **pull-down** de NMOS (que liga a saída ao GND). As duas redes são **duais**: onde uma tem transistores em série, a outra tem em paralelo.

![NAND e NOR em CMOS](/assets/images/100dias/dia_002/dia_002_nand_nor_cmos.png)

- **NAND**: os NMOS estão em **série**, então a saída só vai para `0` quando `in_a` **e** `in_b` são `1`. Os PMOS estão em **paralelo**: basta uma entrada em `0` para a saída ir para `1`.
- **NOR**: os NMOS estão em **paralelo**, então qualquer entrada em `1` leva a saída para `0`. Os PMOS estão em **série**: a saída só vai para `1` quando as duas entradas são `0`.

Cada uma usa só **4 transistores**. Já a AND e a OR precisam de uma NAND/NOR seguida de um inversor (**6 transistores**). Por isso, em projetos reais, as ferramentas de síntese preferem NANDs e NORs.

---

## Código Verilog

Cada porta vira uma atribuição contínua (`assign`) usando os operadores **bit a bit** do Verilog:

```verilog
// ============================================================================
// VLSI Brasil - 100 Dias de RTL
// Dia 002 - Portas Lógicas
// ----------------------------------------------------------------------------
// Descrição : Implementa as seis portas lógicas básicas de duas entradas:
//             AND, OR, NAND, NOR, XOR e XNOR.
// ============================================================================

`timescale 1ns / 1ps

module portas_logicas (
    input  wire in_a,       // entrada A
    input  wire in_b,       // entrada B
    output wire out_and,    // A AND B
    output wire out_or,     // A OR B
    output wire out_nand,   // NOT (A AND B)
    output wire out_nor,    // NOT (A OR B)
    output wire out_xor,    // A XOR B
    output wire out_xnor    // NOT (A XOR B)
);

    assign out_and  =   in_a & in_b;
    assign out_or   =   in_a | in_b;
    assign out_nand = ~(in_a & in_b);
    assign out_nor  = ~(in_a | in_b);
    assign out_xor  =   in_a ^ in_b;
    assign out_xnor = ~(in_a ^ in_b);

endmodule
```

| Operação | Operador Verilog | Exemplo                 |
|----------|------------------|-------------------------|
| AND      | `&`              | `in_a & in_b`           |
| OR       | `\|`             | `in_a \| in_b`          |
| XOR      | `^`              | `in_a ^ in_b`           |
| NOT      | `~`              | `~in_a`                 |
| NAND     | `~( & )`         | `~(in_a & in_b)`        |
| NOR      | `~( \| )`        | `~(in_a \| in_b)`       |
| XNOR     | `~^` ou `~( ^ )` | `in_a ~^ in_b`          |

> **Cuidado:** não confunda os operadores bit a bit (`&`, `|`) com os operadores **lógicos** (`&&`, `||`). Os lógicos tratam cada operando como verdadeiro/falso e sempre devolvem 1 bit, como em C. Para sinais de 1 bit o resultado é o mesmo, mas em barramentos eles se comportam de forma bem diferente: `4'b1100 & 4'b1010 = 4'b1000`, enquanto `4'b1100 && 4'b1010 = 1'b1`.

## Testbench

O testbench percorre as 4 combinações de entrada e compara as seis saídas de uma só vez:

```verilog
// ============================================================================
// VLSI Brasil - 100 Dias de RTL
// Dia 002 - Testbench das Portas Lógicas
// ============================================================================

`timescale 1ns / 1ps

module tb_portas_logicas;

    // Sinais do testbench
    reg  in_a, in_b;
    wire out_and, out_or, out_nand, out_nor, out_xor, out_xnor;

    reg  [5:0] esperado;   // {and, or, nand, nor, xor, xnor}
    wire [5:0] obtido;

    integer i;
    integer erros = 0;

    // Instância do circuito sob teste (DUT - Device Under Test)
    portas_logicas dut (
        .in_a     (in_a),
        .in_b     (in_b),
        .out_and  (out_and),
        .out_or   (out_or),
        .out_nand (out_nand),
        .out_nor  (out_nor),
        .out_xor  (out_xor),
        .out_xnor (out_xnor)
    );

    assign obtido = {out_and, out_or, out_nand, out_nor, out_xor, out_xnor};

    initial begin
        // Arquivo de formas de onda para o GTKWave
        $dumpfile("tb_portas_logicas.vcd");
        $dumpvars(0, tb_portas_logicas);

        // Exibe o tempo em ns
        $timeformat(-9, 0, " ns", 6);

        $display("----------------------------------------------------");
        $display(" tempo  | a b | and or nand nor xor xnor");
        $display("----------------------------------------------------");

        // Percorre todas as combinações de entrada
        for (i = 0; i < 4; i = i + 1) begin
            {in_a, in_b} = i[1:0];
            #10;

            // Modelo de referência: tabela verdade de cada porta
            case ({in_a, in_b})
                2'b00: esperado = 6'b001101;
                2'b01: esperado = 6'b011010;
                2'b10: esperado = 6'b011010;
                2'b11: esperado = 6'b110001;
            endcase

            $display(" %t | %b %b |  %b   %b   %b    %b   %b   %b",
                     $time, in_a, in_b, out_and, out_or, out_nand,
                     out_nor, out_xor, out_xnor);

            if (obtido !== esperado) begin
                $display("ERRO: a=%b b=%b -> obtido %b, esperado %b",
                         in_a, in_b, obtido, esperado);
                erros = erros + 1;
            end
        end

        $display("----------------------------------------------------");
        if (erros == 0)
            $display("SUCESSO: todos os testes passaram!");
        else
            $display("FALHA: %0d erro(s) encontrado(s).", erros);

        $finish;
    end

endmodule
```

Alguns detalhes:

- `{in_a, in_b} = i[1:0];` usa uma **concatenação** do lado esquerdo: o bit 1 de `i` vai para `in_a` e o bit 0 vai para `in_b`. É uma forma compacta de gerar todas as combinações.
- O **modelo de referência** é a própria tabela verdade, escrita "na mão" em um `case`. Ela é independente do código do DUT, então se errarmos um operador no RTL o testbench acusa.
- As seis saídas são agrupadas no vetor `obtido` para que uma única comparação (`!==`) verifique tudo.

---

## Simulação

### Diagrama de tempo esperado

A cada 10 ns aplicamos uma nova combinação (`00`, `01`, `10`, `11`). Em azul estão as entradas, em verde as saídas:

![Diagrama de tempo esperado](/assets/images/100dias/dia_002/dia_002_diagrama_tempo_esperado.png)

### Rodando no Icarus Verilog

```bash
# compila o projeto e o testbench
iverilog -g2012 -Wall -o tb_portas_logicas.vvp rtl/portas_logicas.v rtl/tb_portas_logicas.v

# executa a simulação
vvp tb_portas_logicas.vvp
```

A saída no terminal:

```text
VCD info: dumpfile tb_portas_logicas.vcd opened for output.
----------------------------------------------------
 tempo  | a b | and or nand nor xor xnor
----------------------------------------------------
  10 ns | 0 0 |  0   0   1    1   0   1
  20 ns | 0 1 |  0   1   1    0   1   0
  30 ns | 1 0 |  0   1   1    0   1   0
  40 ns | 1 1 |  1   1   0    0   0   1
----------------------------------------------------
SUCESSO: todos os testes passaram!
```

> Dica: na pasta `sim/` há um `Makefile`. Basta rodar `make` para simular e `make wave` para abrir o GTKWave.

### Formas de onda no GTKWave

```bash
gtkwave tb_portas_logicas.vcd
```

![Resultado da simulação no GTKWave](/assets/images/100dias/dia_002/dia_002_simulacao_gtkwave.png)

As formas de onda batem com o diagrama esperado. Uma boa forma de conferir é olhar coluna por coluna: entre 30 e 40 ns, com `in_a = in_b = 1`, apenas `out_and`, `out_or` e `out_xnor` ficam em `1`.

---

## Resumo

- AND, OR e XOR são as funções básicas; NAND, NOR e XNOR são as suas versões invertidas.
- NAND e NOR são **portas universais** e as mais "baratas" em CMOS (4 transistores).
- Em Verilog: `&`, `|`, `^` e `~` (operadores bit a bit), diferentes dos operadores lógicos `&&` e `||`.
- O testbench usa uma tabela verdade escrita à mão como modelo de referência.

No **Dia 003** vamos usar essas portas para construir o nosso primeiro bloco "de verdade": o **multiplexador**. Até amanhã!
