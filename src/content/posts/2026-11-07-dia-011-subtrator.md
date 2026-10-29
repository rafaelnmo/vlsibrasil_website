---
title: "Dia 011 - Subtrator"
description: "Dia 011 do 100 Dias de RTL: o subtrator em complemento de dois, montado com o somador do Dia 007, com detecção de empréstimo e estouro, testbench e simulação no Icarus Verilog e GTKWave."
date: 2026-11-07
author: rafael
categories: ["100 Dias de RTL", "Verilog"]
tags: ["RTL", "Verilog", "Aritmética", "Subtrator", "Complemento de Dois", "Icarus Verilog", "GTKWave"]
cover: "/assets/images/100dias/dia_011/dia_011_capa.png"
draft: true
---
Depois de quatro dias de somadores, hoje vamos subtrair. A boa notícia é que **não precisamos de um circuito novo**: com a representação em **complemento de dois**, uma subtração vira uma soma, e o somador do Dia 007 faz todo o trabalho. De quebra, vamos ver como o mesmo padrão de bits pode representar números **com** e **sem sinal**, e como detectar quando o resultado não cabe nos bits disponíveis.

---

## Descrição

O subtrator calcula `in_a - in_b`. Ele tem três saídas:

- **`diff`**: a diferença, com a mesma largura dos operandos;
- **`borrow`** (empréstimo): vale `1` quando `in_a < in_b`, olhando os números **sem sinal**. É o "pede emprestado" da subtração feita à mão;
- **`overflow`** (estouro): vale `1` quando o resultado **com sinal** não cabe em `WIDTH` bits.

### Complemento de dois

Para representar números negativos em binário, quase todo hardware usa o **complemento de dois**: o bit mais significativo passa a valer **negativo**. Com 4 bits, o MSB vale `-8` em vez de `+8`:

![Os 16 valores de 4 bits, sem sinal e com sinal](/assets/images/100dias/dia_011/dia_011_complemento_dois.png)

Repare que os padrões de `0000` a `0111` valem o mesmo nas duas leituras. De `1000` a `1111`, a leitura com sinal é a sem sinal menos 16. O hardware não sabe qual das duas estamos usando: **são os mesmos bits, e o mesmo somador serve para os dois casos**. Quem decide a interpretação é quem usa o resultado.

A grande vantagem do complemento de dois é que o negativo de um número é fácil de calcular: **inverta todos os bits e some 1**.

```text
  3 = 0011
 ~3 = 1100      (inverte)
 -3 = 1101      (soma 1)   ->  -8 + 4 + 1 = -3
```

E então `A - B = A + (-B) = A + ~B + 1`. No somador, o `+ 1` entra **de graça** pelo vai-um de entrada: basta ligar `cin = 1`.

## Diagrama de Blocos

![Diagrama de blocos do subtrator](/assets/images/100dias/dia_011/dia_011_diagrama_blocos.png)

| Sinal      | Direção | Largura | Descrição                                      |
|------------|---------|---------|------------------------------------------------|
| `in_a`     | entrada | WIDTH   | Minuendo                                       |
| `in_b`     | entrada | WIDTH   | Subtraendo                                     |
| `diff`     | saída   | WIDTH   | Diferença `in_a - in_b`                        |
| `borrow`   | saída   | 1 bit   | Empréstimo: `in_a < in_b` (sem sinal)          |
| `overflow` | saída   | 1 bit   | Estouro: o resultado com sinal não cabe        |

## Tabela Verdade

Assim como o somador completo resolve uma coluna da soma, o **subtrator completo** resolve uma coluna da subtração: calcula `a - b - bin`, onde `bin` é o empréstimo que a coluna da direita pediu. Ele gera o bit de diferença `d` e o empréstimo para a coluna da esquerda, `bout`:

![Tabela verdade do subtrator completo](/assets/images/100dias/dia_011/dia_011_tabela_verdade.png)

## Mapa de Karnaugh

![Mapas de Karnaugh do subtrator completo](/assets/images/100dias/dia_011/dia_011_mapa_karnaugh.png)

- **`d`**: o tabuleiro de xadrez de novo. A diferença de um bit é a mesma XOR da soma.
- **`bout`**: três grupos de dois. Há empréstimo quando `a = 0` e há algo para subtrair (`b` ou `bin`), ou quando `b` e `bin` valem `1` ao mesmo tempo (aí falta mesmo com `a = 1`).

Poderíamos montar um subtrator ripple com N subtratores completos, mas não precisamos: o complemento de dois nos deixa **reaproveitar o somador**.

## Expressões Booleanas

![Expressões do subtrator](/assets/images/100dias/dia_011/dia_011_expressao_booleana.png)

- `d` e `bout` são as equações do subtrator completo, tiradas dos mapas.
- `-B = ~B + 1` é o complemento de dois, e por isso `A - B = A + ~B + 1`.
- **`borrow = ~cout`**: na soma `A + ~B + 1`, o vai-um de saída vale `1` exatamente quando **não** houve empréstimo (`A ≥ B`). É o contrário do que acontece na soma, então invertemos.
- **`overflow`**: só pode haver estouro quando os operandos têm **sinais diferentes** (positivo menos negativo, ou negativo menos positivo). Nesse caso, há estouro se o sinal do resultado for diferente do sinal de `in_a`. Por exemplo, `7 - (-1) = 8` não cabe em 4 bits com sinal (o máximo é 7) e dá `1000`, que é -8.

## Diagrama de Circuito

![Subtrator montado com o somador do Dia 007](/assets/images/100dias/dia_011/dia_011_diagrama_circuito.png)

O subtrator inteiro é: **4 inversores** em `in_b`, o **somador** do Dia 007 com `cin = 1`, um inversor no `cout` e a lógica de estouro (duas XORs e uma AND). Repare que trocar os inversores por XORs controladas por um sinal `sub` daria um circuito que **soma ou subtrai**: com `sub = 0`, a XOR deixa `in_b` passar e `cin = 0`; com `sub = 1`, ela inverte `in_b` e `cin = 1`. É assim que a ALU de um processador faz as duas operações com o mesmo somador.

---

## Código Verilog

O subtrator reaproveita o `somador_cpa` do Dia 007, copiado para a pasta `rtl/` deste dia:

```verilog
// ============================================================================
// VLSI Brasil - 100 Dias de RTL
// Dia 011 - Subtrator em Complemento de Dois (Subtractor)
// ----------------------------------------------------------------------------
// Descrição : Calcula in_a - in_b com WIDTH bits, usando o somador do Dia 007:
//             in_a - in_b = in_a + (~in_b) + 1
//             borrow   = 1 quando in_a < in_b (números sem sinal)
//             overflow = 1 quando o resultado não cabe em WIDTH bits
//                        (números com sinal, complemento de dois)
// ============================================================================

`timescale 1ns / 1ps

module subtrator #(
    parameter WIDTH = 4                 // largura dos operandos
) (
    input  wire [WIDTH-1:0] in_a,       // minuendo
    input  wire [WIDTH-1:0] in_b,       // subtraendo
    output wire [WIDTH-1:0] diff,       // diferença
    output wire             borrow,     // empréstimo (sem sinal: in_a < in_b)
    output wire             overflow    // estouro (com sinal)
);

    wire carry;     // vai-um do somador: 1 quando NÃO há empréstimo

    // Complemento de dois do subtraendo: inverte os bits (~in_b)
    // e soma 1 pelo vai-um de entrada
    somador_cpa #(.WIDTH(WIDTH)) u_soma (
        .in_a (in_a),
        .in_b (~in_b),
        .cin  (1'b1),
        .sum  (diff),
        .cout (carry)
    );

    assign borrow = ~carry;

    // Estouro com sinal: os operandos têm sinais diferentes e o sinal
    // do resultado é diferente do sinal de in_a
    assign overflow = (in_a[WIDTH-1] ^ in_b[WIDTH-1]) & (diff[WIDTH-1] ^ in_a[WIDTH-1]);

endmodule
```

O que há de novo aqui:

- **Expressões nas conexões de porta**: `.in_b (~in_b)` liga à porta do somador o **inverso** de `in_b`. Uma conexão pode receber qualquer expressão, não só um fio; a ferramenta cria a lógica (aqui, 4 inversores) automaticamente.
- **Constantes com tamanho**: `.cin (1'b1)` liga a porta a um `1` fixo. A forma `1'b1` diz explicitamente: **1** bit, em **b**inário, valor **1**. Outras formas: `4'd9` (4 bits, decimal 9), `8'hFF` (8 bits, hexadecimal FF).
- **O mesmo circuito, duas leituras**: nada no código diz se os números têm sinal. `borrow` é a conclusão certa para números sem sinal, e `overflow` para números com sinal; quem usa o subtrator escolhe qual olhar.

## Testbench

```verilog
// ============================================================================
// VLSI Brasil - 100 Dias de RTL
// Dia 011 - Testbench do Subtrator
// ============================================================================

`timescale 1ns / 1ps

module tb_subtrator;

    parameter WIDTH = 4;

    // Sinais do testbench
    reg  [WIDTH-1:0] in_a, in_b;
    wire [WIDTH-1:0] diff;
    wire             borrow, overflow;

    reg  [WIDTH:0]   esperado;          // {borrow, diff}
    reg              ovf_esperado;

    localparam [WIDTH-1:0] MSB = 1 << (WIDTH - 1);   // 1000...0

    integer i;
    integer testes = 0;
    integer erros  = 0;

    // Instância do circuito sob teste (DUT - Device Under Test)
    subtrator #(.WIDTH(WIDTH)) dut (
        .in_a     (in_a),
        .in_b     (in_b),
        .diff     (diff),
        .borrow   (borrow),
        .overflow (overflow)
    );

    // Modelo de referência
    task verifica;
        reg [WIDTH:0] exata;
        begin
            // Sem sinal: a subtração em WIDTH+1 bits deixa o empréstimo no MSB
            esperado = {1'b0, in_a} - {1'b0, in_b};
            // Com sinal: estende o sinal para WIDTH+1 bits, onde a diferença
            // exata sempre cabe. Há estouro se os dois bits de cima diferem
            exata = {in_a[WIDTH-1], in_a} - {in_b[WIDTH-1], in_b};
            ovf_esperado = exata[WIDTH] ^ exata[WIDTH-1];
            testes = testes + 1;
            if ({borrow, diff} !== esperado || overflow !== ovf_esperado) begin
                $display("ERRO: %0d - %0d -> diff=%0d borrow=%b overflow=%b, esperado %0d %b %b",
                         in_a, in_b, diff, borrow, overflow,
                         esperado[WIDTH-1:0], esperado[WIDTH], ovf_esperado);
                erros = erros + 1;
            end
        end
    endtask

    // Aplica um teste dirigido, espera 10 ns e mostra o resultado
    // (sem sinal e com sinal)
    task aplica(input [WIDTH-1:0] a, input [WIDTH-1:0] b);
        begin
            in_a = a; in_b = b;
            #10;
            $display(" %t | %3d - %3d = %3d  b=%b | %4d - %4d = %4d  v=%b",
                     $time, in_a, in_b, diff, borrow,
                     $signed(in_a), $signed(in_b), $signed(diff), overflow);
            verifica;
        end
    endtask

    initial begin
        // Arquivo de formas de onda para o GTKWave
        $dumpfile("tb_subtrator.vcd");
        $dumpvars(0, tb_subtrator);

        // Exibe o tempo em ns
        $timeformat(-9, 0, " ns", 6);

        $display("WIDTH = %0d", WIDTH);
        $display("---------------------------------------------------------");
        $display(" tempo  |       sem sinal          |       com sinal");
        $display("---------------------------------------------------------");

        // Parte 1: testes dirigidos (aparecem nas formas de onda)
        aplica(7, 3);                       // resultado positivo
        aplica(3, 7);                       // empréstimo: resultado negativo
        aplica(5, 5);                       // resultado zero
        aplica(0, 1);                       // 0 - 1 = 1111...1
        aplica(MSB - 1, {WIDTH{1'b1}});     // maior positivo - (-1): estouro
        aplica(MSB, 1);                     // menor negativo - 1: estouro

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

        $display("---------------------------------------------------------");
        if (erros == 0)
            $display("SUCESSO: %0d testes passaram!", testes);
        else
            $display("FALHA: %0d erro(s) em %0d testes.", erros, testes);

        $finish;
    end

endmodule
```

As novidades do testbench:

- **`$signed(...)`**: trata um vetor como número **com sinal** (complemento de dois). Usamos para mostrar os valores com sinal no terminal (`%d` com `$signed` imprime `-4` em vez de `12`).
- **Variável local dentro da `task`**: `reg [WIDTH:0] exata;` existe só dentro da `task verifica`.
- **Modelo de referência do estouro com extensão de sinal**: em `{in_a[WIDTH-1], in_a}`, repetimos o bit de sinal para ganhar um bit a mais **sem mudar o valor** (`1101` = -3 vira `11101`, que ainda é -3). Com WIDTH+1 bits, a diferença exata sempre cabe, e há estouro quando os dois bits de cima do resultado são diferentes, ou seja, quando o resultado não cabe de volta em WIDTH bits.

Uma observação: a primeira versão deste testbench calculava o estouro com variáveis `integer` (32 bits). Funcionava com 4 e 8 bits, mas dava **falsos erros** com `WIDTH = 32`, porque a própria conta do modelo estourava. A versão com extensão de sinal funciona para qualquer largura. Lição: **o modelo de referência também precisa ser verificado**.

---

## Simulação

### Diagrama de tempo esperado

Os 6 testes dirigidos (valores sem sinal). Repare nos dois casos de estouro no final: `7 - (-1)` e `-8 - 1`:

![Diagrama de tempo esperado](/assets/images/100dias/dia_011/dia_011_diagrama_tempo_esperado.png)

### Rodando no Icarus Verilog

```bash
# compila o projeto (dois módulos) e o testbench
iverilog -g2012 -Wall -o tb_subtrator.vvp rtl/somador_cpa.v rtl/subtrator.v rtl/tb_subtrator.v

# executa a simulação
vvp tb_subtrator.vvp
```

A saída no terminal mostra cada teste nas duas leituras, sem sinal e com sinal:

```text
VCD info: dumpfile tb_subtrator.vcd opened for output.
WIDTH = 4
---------------------------------------------------------
 tempo  |       sem sinal          |       com sinal
---------------------------------------------------------
  10 ns |   7 -   3 =   4  b=0 |    7 -    3 =    4  v=0
  20 ns |   3 -   7 =  12  b=1 |    3 -    7 =   -4  v=0
  30 ns |   5 -   5 =   0  b=0 |    5 -    5 =    0  v=0
  40 ns |   0 -   1 =  15  b=1 |    0 -    1 =   -1  v=0
  50 ns |   7 -  15 =   8  b=1 |    7 -   -1 =   -8  v=1
  60 ns |   8 -   1 =   7  b=0 |   -8 -    1 =    7  v=1
---------------------------------------------------------
SUCESSO: 262 testes passaram!
```

Veja a linha de 20 ns: `3 - 7` dá `12` sem sinal (com `borrow = 1`, pois o resultado "deu a volta"), que é exatamente `-4` com sinal. Os mesmos bits, `1100`, são a resposta certa nas duas leituras.

Com 32 bits:

```bash
iverilog -g2012 -Wall -P tb_subtrator.WIDTH=32 -o tb_subtrator.vvp rtl/somador_cpa.v rtl/subtrator.v rtl/tb_subtrator.v
vvp tb_subtrator.vvp
```

```text
WIDTH = 32
SUCESSO: 1006 testes passaram!
```

### Formas de onda no GTKWave

```bash
gtkwave tb_subtrator.vcd
```

![Resultado da simulação no GTKWave](/assets/images/100dias/dia_011/dia_011_simulacao_gtkwave.png)

> **Dica:** para ver `diff` com sinal no GTKWave, selecione o sinal e use o botão direito → **Data Format** → **Signed Decimal**.

---

## Resumo

- Em **complemento de dois**, o MSB vale negativo, e o negativo de um número é `~B + 1`.
- Por isso `A - B = A + ~B + 1`: o subtrator é o **somador do Dia 007** com inversores em `in_b` e `cin = 1`.
- `borrow = ~cout` indica `A < B` para números sem sinal; `overflow` indica que o resultado com sinal não coube.
- Os mesmos bits servem para números com e sem sinal; quem interpreta é quem usa o resultado.
- Em Verilog: expressões nas conexões de porta, constantes com tamanho (`1'b1`) e `$signed`.

No **Dia 012** vamos usar o subtrator para **comparar** dois números: igual, menor ou maior, com e sem sinal. Até amanhã!
