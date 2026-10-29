---
title: "Dia 012 - Comparador"
description: "Dia 012 do 100 Dias de RTL: o comparador de magnitude com e sem sinal, usando XNOR para igualdade e o subtrator do Dia 011 para menor e maior."
date: 2026-11-08
author: rafael
categories: ["100 Dias de RTL", "Verilog"]
tags: ["RTL", "Verilog", "Aritmética", "Comparador", "Complemento de Dois", "Icarus Verilog", "GTKWave"]
cover: "/assets/images/100dias/dia_012/dia_012_capa.png"
draft: true
---
Decidir se um número é **igual**, **menor** ou **maior** que outro está em todo lugar: num `if (a < b)` de um programa, nos desvios condicionais de um processador, num ordenador de dados, num contador que precisa saber quando parar. Hoje construímos o **comparador**, e ele vai reaproveitar o subtrator de ontem, que por sua vez reaproveita o somador do Dia 007. Três níveis de hierarquia, cada um construído sobre o anterior.

---

## Descrição

O comparador recebe dois números de `WIDTH` bits e responde cinco perguntas:

- **`eq`**: `in_a == in_b`?
- **`lt`** / **`gt`**: `in_a < in_b` / `in_a > in_b`, tratando os números **sem sinal**;
- **`lt_s`** / **`gt_s`**: as mesmas perguntas, tratando os números **com sinal** (complemento de dois).

Por que duas versões de "menor"? Porque, como vimos ontem, os mesmos bits valem coisas diferentes nas duas leituras. `1000` contra `0111`, com 4 bits:

- **sem sinal**: `8 > 7`, então `gt = 1`;
- **com sinal**: `-8 < 7`, então `lt_s = 1`.

Mesmas entradas, respostas opostas. Em linguagens como C, quem decide é o tipo da variável (`unsigned` ou `int`); no hardware, o processador tem instruções diferentes para cada caso (no RISC-V, por exemplo, `bltu` e `blt`).

Para responder a todas as perguntas, usamos duas ideias:

- **Igualdade**: dois números são iguais quando **todos** os bits são iguais. Uma XNOR por bit (que vale `1` quando os bits são iguais) e uma AND juntando tudo.
- **Magnitude**: calculamos `in_a - in_b` com o subtrator do Dia 011 e olhamos o resultado. Sem sinal, `in_a < in_b` exatamente quando a subtração **pede emprestado** (`borrow = 1`).

## Diagrama de Blocos

![Diagrama de blocos do comparador](/assets/images/100dias/dia_012/dia_012_diagrama_blocos.png)

| Sinal  | Direção | Largura | Descrição                          |
|--------|---------|---------|------------------------------------|
| `in_a` | entrada | WIDTH   | Operando A                         |
| `in_b` | entrada | WIDTH   | Operando B                         |
| `eq`   | saída   | 1 bit   | `in_a == in_b`                     |
| `lt`   | saída   | 1 bit   | `in_a < in_b` (sem sinal)          |
| `gt`   | saída   | 1 bit   | `in_a > in_b` (sem sinal)          |
| `lt_s` | saída   | 1 bit   | `in_a < in_b` (com sinal)          |
| `gt_s` | saída   | 1 bit   | `in_a > in_b` (com sinal)          |

## Tabela Verdade

Para 1 bit, o comparador é pequeno o suficiente para caber numa tabela:

![Tabela verdade do comparador de 1 bit](/assets/images/100dias/dia_012/dia_012_tabela_verdade.png)

Em cada linha, exatamente **uma** das três saídas vale `1`: dois números são sempre iguais, ou um é menor, ou um é maior.

## Expressões Booleanas

Do comparador de 1 bit, direto da tabela:

![Expressões do comparador de 1 bit](/assets/images/100dias/dia_012/dia_012_expressao_booleana_1bit.png)

`eq` é a **XNOR** (a XOR negada), `lt` só vale `1` na linha `a = 0, b = 1`, e `gt` na linha `a = 1, b = 0`.

Para `WIDTH` bits:

![Expressões do comparador de N bits](/assets/images/100dias/dia_012/dia_012_expressao_booleana.png)

- **`eq`**: a AND de todas as XNORs bit a bit.
- **`lt`**: o empréstimo da subtração `in_a - in_b`.
- **`gt`**: se não é menor nem igual, é maior. Uma NOR de `lt` e `eq`.
- **`lt_s`**: com sinal, `in_a < in_b` quando a diferença é **negativa** (bit de sinal `diff[3] = 1`)... **a menos que** tenha havido estouro, que inverte o sinal do resultado. Por isso `lt_s = diff[3] ⊕ overflow`. Exemplo com 4 bits: `-8 - 7 = -15` não cabe, e a subtração dá `0001`, que é **+1**, positivo! O bit de sinal diz "não é menor", mas o estouro avisa que o sinal está errado, e a XOR o corrige.
- **`gt_s`**: de novo, nem menor nem igual.

## Diagrama de Circuito

![Comparador de 4 bits](/assets/images/100dias/dia_012/dia_012_diagrama_circuito.png)

Em cima, a igualdade: 4 XNORs e uma AND de 4 entradas. Embaixo, o subtrator do Dia 011 (que contém o somador do Dia 007) gera `borrow`, `overflow` e o bit de sinal `diff[3]`. Uma XOR e duas NORs completam as cinco saídas.

---

## Código Verilog

O comparador usa o `subtrator` do Dia 011 e o `somador_cpa` do Dia 007, copiados para a pasta `rtl/`:

```verilog
// ============================================================================
// VLSI Brasil - 100 Dias de RTL
// Dia 012 - Comparador de Magnitude (Comparator)
// ----------------------------------------------------------------------------
// Descrição : Compara dois números de WIDTH bits.
//             eq         : in_a == in_b
//             lt / gt    : in_a <  in_b / in_a >  in_b  (sem sinal)
//             lt_s / gt_s: in_a <  in_b / in_a >  in_b  (com sinal)
//             Igualdade com XNOR + AND de redução; magnitude com o subtrator
//             do Dia 011 (in_a - in_b).
// ============================================================================

`timescale 1ns / 1ps

module comparador #(
    parameter WIDTH = 4                 // largura dos operandos
) (
    input  wire [WIDTH-1:0] in_a,       // operando A
    input  wire [WIDTH-1:0] in_b,       // operando B
    output wire             eq,         // A == B
    output wire             lt,         // A <  B (sem sinal)
    output wire             gt,         // A >  B (sem sinal)
    output wire             lt_s,       // A <  B (com sinal)
    output wire             gt_s        // A >  B (com sinal)
);

    // Igualdade: todos os bits iguais (XNOR bit a bit, depois AND de redução)
    assign eq = &(in_a ~^ in_b);

    // Magnitude: calcula in_a - in_b e olha os sinalizadores
    wire [WIDTH-1:0] diff;
    wire             borrow, overflow;

    subtrator #(.WIDTH(WIDTH)) u_sub (
        .in_a     (in_a),
        .in_b     (in_b),
        .diff     (diff),
        .borrow   (borrow),
        .overflow (overflow)
    );

    // Sem sinal: houve empréstimo -> A < B
    assign lt = borrow;
    assign gt = ~lt & ~eq;

    // Com sinal: o resultado é negativo (bit de sinal), a menos que tenha
    // havido estouro, que inverte o sinal
    assign lt_s = diff[WIDTH-1] ^ overflow;
    assign gt_s = ~lt_s & ~eq;

endmodule
```

O que há de novo aqui:

- **`~^` (XNOR)**: o operador XNOR bit a bit. `in_a ~^ in_b` gera um vetor com `1` onde os bits são iguais.
- **AND de redução de uma expressão**: `&(in_a ~^ in_b)` aplica a AND de redução (vista no Dia 009) sobre o resultado da XNOR. Uma linha, `WIDTH` XNORs e uma AND larga.
- **Fios internos declarados no meio do módulo**: `diff`, `borrow` e `overflow` são declarados logo antes de serem usados. Em Verilog, um fio pode ser declarado em qualquer ponto do módulo, desde que **antes** do primeiro uso.
- **Hierarquia em três níveis**: `comparador` → `subtrator` → `somador_cpa`. No GTKWave, o caminho completo do somador é `tb_comparador.dut.u_sub.u_soma`.

> **Na prática:** em um projeto real, o comparador costuma ser escrito diretamente com os operadores relacionais: `assign lt = in_a < in_b;` e `assign lt_s = $signed(in_a) < $signed(in_b);`. A ferramenta de síntese gera um circuito parecido com o nosso. Montar à mão mostra **de onde** vem cada sinal, e por que a comparação com sinal é diferente da sem sinal.

## Testbench

```verilog
// ============================================================================
// VLSI Brasil - 100 Dias de RTL
// Dia 012 - Testbench do Comparador
// ============================================================================

`timescale 1ns / 1ps

module tb_comparador;

    parameter WIDTH = 4;

    // Sinais do testbench
    reg  [WIDTH-1:0] in_a, in_b;
    wire             eq, lt, gt, lt_s, gt_s;

    reg  [4:0]       esperado;          // {eq, lt, gt, lt_s, gt_s}

    localparam [WIDTH-1:0] MSB = 1 << (WIDTH - 1);   // 1000...0

    integer i;
    integer testes = 0;
    integer erros  = 0;

    // Instância do circuito sob teste (DUT - Device Under Test)
    comparador #(.WIDTH(WIDTH)) dut (
        .in_a (in_a),
        .in_b (in_b),
        .eq   (eq),
        .lt   (lt),
        .gt   (gt),
        .lt_s (lt_s),
        .gt_s (gt_s)
    );

    // Modelo de referência: os operadores relacionais do Verilog.
    // Com $signed, a comparação é feita em complemento de dois
    task verifica;
        begin
            esperado = {in_a == in_b,
                        in_a <  in_b,
                        in_a >  in_b,
                        $signed(in_a) < $signed(in_b),
                        $signed(in_a) > $signed(in_b)};
            testes = testes + 1;
            if ({eq, lt, gt, lt_s, gt_s} !== esperado) begin
                $display("ERRO: a=%0d b=%0d -> {eq,lt,gt,lt_s,gt_s}=%b, esperado %b",
                         in_a, in_b, {eq, lt, gt, lt_s, gt_s}, esperado);
                erros = erros + 1;
            end
        end
    endtask

    // Aplica um teste dirigido, espera 10 ns e mostra o resultado
    task aplica(input [WIDTH-1:0] a, input [WIDTH-1:0] b);
        begin
            in_a = a; in_b = b;
            #10;
            $display(" %t | %3d %3d | %4d %4d |  %b  %b  %b |  %b    %b",
                     $time, in_a, in_b, $signed(in_a), $signed(in_b),
                     eq, lt, gt, lt_s, gt_s);
            verifica;
        end
    endtask

    initial begin
        // Arquivo de formas de onda para o GTKWave
        $dumpfile("tb_comparador.vcd");
        $dumpvars(0, tb_comparador);

        // Exibe o tempo em ns
        $timeformat(-9, 0, " ns", 6);

        $display("WIDTH = %0d", WIDTH);
        $display("               sem sinal  com sinal");
        $display("--------------------------------------------------");
        $display(" tempo  |   a   b |    a    b | eq lt gt | lt_s gt_s");
        $display("--------------------------------------------------");

        // Parte 1: testes dirigidos (aparecem nas formas de onda)
        aplica(5, 5);                       // iguais
        aplica(3, 9);                       // A < B
        aplica(9, 3);                       // A > B
        aplica(MSB, MSB - 1);               // sem sinal A > B, com sinal A < B
        aplica({WIDTH{1'b1}}, 1);           // 1111 é 15 (sem sinal) ou -1 (com sinal)
        aplica(0, {WIDTH{1'b1}});           // 0 contra o maior número

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
            // 1000 testes aleatórios, metade deles com in_a == in_b
            for (i = 0; i < 1000; i = i + 1) begin
                in_a = {$random, $random};
                in_b = (i % 2) ? in_a : {$random, $random};
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

Aqui o modelo de referência usa justamente os **operadores relacionais** do Verilog: `==`, `<` e `>`. Cada comparação devolve um único bit (`1` para verdadeiro, `0` para falso), e por isso podemos juntar as cinco numa concatenação e comparar tudo de uma vez com `{eq, lt, gt, lt_s, gt_s}`.

- **`$signed(in_a) < $signed(in_b)`**: com `$signed` nos **dois** lados, a comparação é feita em complemento de dois. Se só um lado for `$signed`, o Verilog trata os dois como sem sinal, uma armadilha clássica da linguagem.
- **Teste aleatório com igualdade forçada**: com 32 bits, a chance de dois números aleatórios serem iguais é praticamente zero, e `eq = 1` nunca seria testado. Por isso, nos testes aleatórios, metade das vezes fazemos `in_b = in_a`.

---

## Simulação

### Diagrama de tempo esperado

![Diagrama de tempo esperado](/assets/images/100dias/dia_012/dia_012_diagrama_tempo_esperado.png)

Entre 30 e 50 ns, `lt`/`gt` e `lt_s`/`gt_s` discordam: `8` contra `7` e `15` contra `1` mudam de lado quando lidos com sinal (`-8` e `-1`).

### Rodando no Icarus Verilog

Agora são **três módulos de RTL**:

```bash
# compila o projeto (três módulos) e o testbench
iverilog -g2012 -Wall -o tb_comparador.vvp rtl/somador_cpa.v rtl/subtrator.v rtl/comparador.v rtl/tb_comparador.v

# executa a simulação
vvp tb_comparador.vvp
```

A saída no terminal:

```text
VCD info: dumpfile tb_comparador.vcd opened for output.
WIDTH = 4
               sem sinal  com sinal
--------------------------------------------------
 tempo  |   a   b |    a    b | eq lt gt | lt_s gt_s
--------------------------------------------------
  10 ns |   5   5 |    5    5 |  1  0  0 |  0    0
  20 ns |   3   9 |    3   -7 |  0  1  0 |  0    1
  30 ns |   9   3 |   -7    3 |  0  0  1 |  1    0
  40 ns |   8   7 |   -8    7 |  0  0  1 |  1    0
  50 ns |  15   1 |   -1    1 |  0  0  1 |  1    0
  60 ns |   0  15 |    0   -1 |  0  1  0 |  0    1
--------------------------------------------------
SUCESSO: 262 testes passaram!
```

Com 32 bits:

```bash
iverilog -g2012 -Wall -P tb_comparador.WIDTH=32 -o tb_comparador.vvp rtl/somador_cpa.v rtl/subtrator.v rtl/comparador.v rtl/tb_comparador.v
vvp tb_comparador.vvp
```

```text
WIDTH = 32
SUCESSO: 1006 testes passaram!
```

### Formas de onda no GTKWave

```bash
gtkwave tb_comparador.vcd
```

![Resultado da simulação no GTKWave](/assets/images/100dias/dia_012/dia_012_simulacao_gtkwave.png)

---

## Resumo

- O comparador responde `==`, `<` e `>`, com e sem sinal.
- **Igualdade**: XNOR bit a bit e uma AND de redução.
- **Magnitude sem sinal**: `in_a < in_b` é o empréstimo de `in_a - in_b`.
- **Magnitude com sinal**: `lt_s = diff[MSB] ⊕ overflow`, o sinal do resultado corrigido pelo estouro.
- Os mesmos bits podem dar respostas opostas com e sem sinal; por isso os processadores têm instruções separadas para cada caso.
- Em Verilog: `~^`, redução sobre expressões, operadores relacionais e o cuidado de usar `$signed` dos dois lados.

No **Dia 013** saímos da aritmética e vamos **mover bits**: o **deslocador barrel**, que desloca um número qualquer quantidade de posições em um único passo. Até amanhã!
