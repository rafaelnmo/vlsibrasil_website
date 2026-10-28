---
title: "Dia 007 - Somador CPA (Carry Propagate Adder)"
description: "Dia 007 do 100 Dias de RTL: o somador com propagação de vai-um (CPA) de N bits, os sinais de geração e propagação, aritmética com vetores em Verilog e teste exaustivo com Icarus Verilog e GTKWave."
date: 2026-11-03
author: rafael
categories: ["100 Dias de RTL", "Verilog"]
tags: ["RTL", "Verilog", "Aritmética", "Somador", "CPA", "Icarus Verilog", "GTKWave"]
cover: "/assets/images/100dias/dia_007/dia_007_capa.png"
draft: true
---
Com o somador completo do Dia 006 sabemos somar **uma coluna**. Hoje damos o salto para números de **vários bits** com o **somador com propagação de vai-um** (*Carry Propagate Adder*, ou **CPA**). Mais do que um circuito específico, CPA é o nome da **família** de somadores em que o vai-um de cada coluna precisa chegar à coluna seguinte. Hoje vamos entender esse problema e descrever o somador de forma **comportamental**, com o operador `+`. Nos próximos três dias veremos três maneiras de construí-lo em hardware: **ripple-carry**, **carry-lookahead** e **prefixo**.

---

## Descrição

Um CPA de N bits recebe dois operandos de N bits (`in_a` e `in_b`) e um vai-um de entrada (`cin`), e produz uma soma de N bits (`sum`) e um vai-um de saída (`cout`):

```text
   vai-um:  1 1 1 1 0       <- c[4] c[3] c[2] c[1] c[0]
              1 1 1 1   (15)   in_a
          +   0 0 0 1   ( 1)   in_b
          -----------
            1 0 0 0 0   (16)   {cout, sum}
```

Com operandos sem sinal de N bits, o maior resultado possível é `(2ᴺ - 1) + (2ᴺ - 1) + 1 = 2ᴺ⁺¹ - 1`, que cabe em **N + 1 bits**. Por isso o resultado completo é `{cout, sum}`: quando `cout = 1`, a soma não coube em N bits (houve **estouro**, ou *overflow*, em números sem sinal).

O exemplo acima é o **pior caso** do CPA: o vai-um gerado na coluna 0 precisa atravessar **todas** as colunas até virar o `cout`. Cada coluna só sabe o seu resultado quando o vai-um da coluna anterior chega. É esse caminho, a **cadeia de vai-um**, que define a velocidade de um somador, e cada uma das próximas arquiteturas é uma forma diferente de encurtá-lo.

## Diagrama de Blocos

![Diagrama de blocos do somador CPA](/assets/images/100dias/dia_007/dia_007_diagrama_blocos.png)

| Sinal  | Direção | Largura | Descrição                          |
|--------|---------|---------|------------------------------------|
| `in_a` | entrada | WIDTH   | Operando A                         |
| `in_b` | entrada | WIDTH   | Operando B                         |
| `cin`  | entrada | 1 bit   | Vai-um de entrada (*carry in*)     |
| `sum`  | saída   | WIDTH   | Soma                               |
| `cout` | saída   | 1 bit   | Vai-um de saída (*carry out*)      |

O parâmetro `WIDTH` define a largura dos operandos (4 bits por padrão).

## Tabela Verdade

Com dois operandos de 4 bits e o `cin`, já temos 2⁹ = **512** combinações de entrada, e com 32 bits seriam 2⁶⁵. A tabela verdade completa deixa de ser útil, então olhamos para **uma coluna de cada vez** e perguntamos: o que essa coluna faz com o vai-um que chega nela?

![Geração e propagação em uma coluna](/assets/images/100dias/dia_007/dia_007_tabela_verdade.png)

Olhando só para os bits `a[i]` e `b[i]` da coluna, há três situações:

- **Gera** (`g[i] = 1`): os dois bits valem `1`. A coluna produz vai-um **sozinha**, não importa o que chegue nela.
- **Propaga** (`p[i] = 1`): exatamente um dos bits vale `1`. A coluna **repassa** o vai-um que receber: `c[i+1] = c[i]`.
- **Mata** (*kill*): os dois bits valem `0`. A coluna **nunca** produz vai-um.

Esses dois sinais, **geração** (*generate*) e **propagação** (*propagate*), são a base de todos os somadores rápidos que veremos nos próximos dias.

## Expressões Booleanas

![Expressões booleanas do CPA](/assets/images/100dias/dia_007/dia_007_expressao_booleana.png)

As duas primeiras equações são as do somador completo (Dia 006) aplicadas à coluna `i`, com `c[0] = cin` e `c[N] = cout`. Reescritas com `g[i]` e `p[i]`, elas dizem exatamente o que a tabela acima mostra:

> **há vai-um na saída da coluna se ela gera, ou se ela propaga e chegou vai-um nela.**

Repare que `c[i+1]` depende de `c[i]`, que depende de `c[i-1]`... até `cin`. Essa é a cadeia de vai-um escrita em forma de equação.

## Diagrama de Circuito

Cada coluna é um bloco que soma três bits (um somador completo) e passa o vai-um para a coluna da esquerda:

![Colunas ligadas pela cadeia de vai-um](/assets/images/100dias/dia_007/dia_007_diagrama_circuito.png)

Em azul está o caminho do vai-um. Como `sum[3]` depende de `c[3]`, que depende de `c[2]`, e assim por diante, o resultado só fica correto depois que o vai-um percorre todas as colunas. Amanhã vamos montar exatamente essa estrutura em Verilog, e medir quanto ela custa em atraso.

---

## Código Verilog

Hoje descrevemos o somador de forma **comportamental**: dizemos **o que** o circuito calcula, e deixamos a ferramenta de síntese decidir **como** construí-lo.

```verilog
// ============================================================================
// VLSI Brasil - 100 Dias de RTL
// Dia 007 - Somador com Propagação de Vai-Um (Carry Propagate Adder - CPA)
// ----------------------------------------------------------------------------
// Descrição : Soma dois números de WIDTH bits (in_a e in_b) e o vai-um de
//             entrada cin, gerando a soma de WIDTH bits (sum) e o vai-um de
//             saída (cout).
//             {cout, sum} = in_a + in_b + cin
//             Descrição comportamental: a ferramenta de síntese escolhe a
//             implementação (ripple-carry, lookahead, prefixo...).
// ============================================================================

`timescale 1ns / 1ps

module somador_cpa #(
    parameter WIDTH = 4                 // largura dos operandos
) (
    input  wire [WIDTH-1:0] in_a,       // operando A
    input  wire [WIDTH-1:0] in_b,       // operando B
    input  wire             cin,        // vai-um de entrada (carry in)
    output wire [WIDTH-1:0] sum,        // soma
    output wire             cout        // vai-um de saída (carry out)
);

    // O lado esquerdo tem WIDTH+1 bits: a soma é calculada com WIDTH+1 bits
    // e o bit mais significativo (o vai-um) vai para cout
    assign {cout, sum} = in_a + in_b + cin;

endmodule
```

O que há de novo aqui:

- **Aritmética com vetores**: o operador `+` funciona com vetores de qualquer largura. `in_a + in_b + cin` soma dois números de WIDTH bits e um de 1 bit.
- **A largura do resultado vem do contexto**: em Verilog, a soma é calculada com a largura do **maior** operando envolvido na expressão, incluindo o lado esquerdo da atribuição. Como `{cout, sum}` tem WIDTH+1 bits, a soma é feita com WIDTH+1 bits e o vai-um final cai em `cout`.

> **Cuidado:** se escrevermos só `assign sum = in_a + in_b + cin;`, a soma é calculada com WIDTH bits e o vai-um final é **descartado em silêncio**, sem erro e sem aviso. A concatenação `{cout, sum}` do lado esquerdo é o jeito idiomático de guardar o resultado completo.

Na síntese, a ferramenta troca o `+` por um circuito somador de verdade, escolhido conforme as metas de área e de velocidade. Nos próximos dias vamos construir esses circuitos à mão para entender as opções que ela tem.

## Testbench

```verilog
// ============================================================================
// VLSI Brasil - 100 Dias de RTL
// Dia 007 - Testbench do Somador CPA
// ============================================================================

`timescale 1ns / 1ps

module tb_somador_cpa;

    parameter WIDTH = 4;

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
    somador_cpa #(.WIDTH(WIDTH)) dut (
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
        $dumpfile("tb_somador_cpa.vcd");
        $dumpvars(0, tb_somador_cpa);

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

Este testbench traz várias novidades:

- **`task` com argumentos**: `aplica(a, b, c)` aplica uma combinação de entradas, espera 10 ns, mostra o resultado e chama `verifica`. Cada teste dirigido vira uma linha legível.
- **Testes dirigidos que não dependem da largura**: valores como `{WIDTH{1'b1}}` (todos os bits em `1`) e `MSB` (só o bit mais significativo em `1`) continuam fazendo sentido para qualquer `WIDTH`. Os casos escolhidos exercitam a cadeia de vai-um no pior caso (`1111 + 1` e `1111 + 0 + cin`) e o estouro.
- **Teste exaustivo**: para `WIDTH <= 8`, o laço percorre **todas** as `2^(2·WIDTH+1)` combinações. A atribuição `{in_a, in_b, cin} = i;` divide os bits do contador entre as três entradas, como fizemos com as portas lógicas. Para larguras maiores, o exaustivo levaria tempo demais e o testbench passa para 1000 testes aleatórios.
- **Modelo de referência com WIDTH+1 bits**: `esperado` tem um bit a mais que os operandos, e por isso guarda a soma completa (a mesma regra de largura do código acima).

---

## Simulação

### Diagrama de tempo esperado

Os 7 testes dirigidos, um a cada 10 ns (valores em decimal). Repare que entre 20 e 50 ns três somas diferentes dão `sum = 0` com `cout = 1`, ou seja, 16:

![Diagrama de tempo esperado](/assets/images/100dias/dia_007/dia_007_diagrama_tempo_esperado.png)

### Rodando no Icarus Verilog

```bash
# compila o projeto e o testbench
iverilog -g2012 -Wall -o tb_somador_cpa.vvp rtl/somador_cpa.v rtl/tb_somador_cpa.v

# executa a simulação
vvp tb_somador_cpa.vvp
```

A saída no terminal:

```text
VCD info: dumpfile tb_somador_cpa.vcd opened for output.
WIDTH = 4
------------------------------------------
 tempo  |  a    b   cin | cout sum | total
------------------------------------------
  10 ns |   3    4   0  |  0    7  |   7
  20 ns |   5    6   1  |  0   12  |  12
  30 ns |  15    1   0  |  1    0  |  16
  40 ns |  15    0   1  |  1    0  |  16
  50 ns |   8    8   0  |  1    0  |  16
  60 ns |  15   15   1  |  1   15  |  31
  70 ns |   0    0   0  |  0    0  |   0
------------------------------------------
SUCESSO: 519 testes passaram!
```

Os 7 testes dirigidos mais os 512 do teste exaustivo dão os 519 testes.

Como o somador é parametrizável, podemos testá-lo com **outra largura sem mudar nenhuma linha de código**: a opção `-P` do `iverilog` muda o valor de um parâmetro do módulo de topo na compilação.

```bash
iverilog -g2012 -Wall -P tb_somador_cpa.WIDTH=16 -o tb_somador_cpa.vvp rtl/somador_cpa.v rtl/tb_somador_cpa.v
vvp tb_somador_cpa.vvp
```

```text
WIDTH = 16
SUCESSO: 1007 testes passaram!
```

O testbench passa `WIDTH` adiante para o DUT (`somador_cpa #(.WIDTH(WIDTH))`), então os dois mudam juntos. No `Makefile` deste dia isso virou `make WIDTH=16`.

### Formas de onda no GTKWave

```bash
gtkwave tb_somador_cpa.vcd
```

![Resultado da simulação no GTKWave](/assets/images/100dias/dia_007/dia_007_simulacao_gtkwave.png)

> **Dica:** para ver os barramentos em decimal no GTKWave, selecione os sinais e use o botão direito → **Data Format** → **Decimal**. O arquivo `sim/tb_somador_cpa.gtkw` já vem configurado assim.

---

## Resumo

- Um **CPA** (*Carry Propagate Adder*) soma dois números de N bits e um `cin`, gerando `sum` de N bits e `cout`. O resultado completo `{cout, sum}` tem N + 1 bits.
- Cada coluna **gera** (`g = a·b`), **propaga** (`p = a ⊕ b`) ou **mata** o vai-um: `c[i+1] = g[i] + p[i]·c[i]`.
- O vai-um pode ter que atravessar todas as colunas, e essa cadeia define a velocidade do somador.
- Em Verilog: `assign {cout, sum} = in_a + in_b + cin;`. A largura do resultado vem do contexto, e um lado esquerdo estreito descarta o vai-um em silêncio.
- No testbench: `task` com argumentos, teste exaustivo e troca de parâmetros na linha de comando com `iverilog -P`.

No **Dia 008** vamos construir o CPA da forma mais direta: encadeando somadores completos no **somador ripple-carry**, e usando o `generate` do Verilog para criar quantas cópias forem necessárias. Até amanhã!
