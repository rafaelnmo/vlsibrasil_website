---
title: "Dia 019 - Decodificador"
description: "Dia 019 do 100 Dias de RTL: o decodificador N para 2^N, que converte binário em one-hot, gera todos os mintermos e é, na verdade, um demultiplexador."
date: 2026-11-15
author: rafael
categories: ["100 Dias de RTL", "Verilog"]
tags: ["RTL", "Verilog", "Combinacional", "Decodificador", "Icarus Verilog", "GTKWave"]
cover: "/assets/images/100dias/dia_019/dia_019_capa.png"
draft: true
---
Ontem vimos o código **one-hot**, em que só um bit vale `1`. Hoje construímos o circuito que transforma um número binário nesse código: o **decodificador**. Ele está por toda parte em um sistema digital: escolhe qual linha de uma memória ler, qual registrador de um banco escrever, qual periférico responde a um endereço, qual instrução um processador está executando. E, como vamos ver, ele já apareceu no desafio com outro nome.

---

## Descrição

Um decodificador **N para 2ᴺ** tem N entradas e 2ᴺ saídas. Para cada valor da entrada `in_a`, **exatamente uma** saída vale `1`: a de índice `in_a`. Com N = 3:

```text
in_a = 000  ->  out = 0000 0001   (out[0])
in_a = 101  ->  out = 0010 0000   (out[5])
in_a = 111  ->  out = 1000 0000   (out[7])
```

A entrada **`en`** (habilita) desliga todas as saídas quando vale `0`. Ela é o que permite montar decodificadores maiores a partir de menores: um decodificador 4 para 16 pode ser feito com dois 3 para 8, usando o bit mais significativo para habilitar um ou o outro.

### Já vimos esse circuito

Compare com o **demultiplexador** do Dia 004: ele pegava uma entrada de dado e a enviava para a saída escolhida por `sel`. Se ligarmos a entrada de dado do demux em `1`, a saída escolhida vale `1` e as outras `0`: é um decodificador! Ou seja, **um decodificador é um demux cujo dado é o `en`**. Por isso ele usa a mesma cor dos demuxes nos diagramas do desafio.

## Diagrama de Blocos

![Diagrama de blocos do decodificador](/assets/images/100dias/dia_019/dia_019_diagrama_blocos.png)

| Sinal  | Direção | Largura | Descrição                            |
|--------|---------|---------|--------------------------------------|
| `in_a` | entrada | N       | Código binário                       |
| `en`   | entrada | 1 bit   | Habilita (`0` desliga todas as saídas) |
| `out`  | saída   | 2ᴺ      | Código one-hot                       |

## Tabela Verdade

O decodificador 3 para 8. A primeira linha resume os 8 casos com `en = 0` (o `x` significa "qualquer valor"):

![Tabela verdade do decodificador 3 para 8](/assets/images/100dias/dia_019/dia_019_tabela_verdade.png)

Repare na diagonal de `1`s: cada linha acende uma saída diferente.

## Expressões Booleanas

Para o decodificador 2 para 4:

![Expressões do decodificador 2 para 4](/assets/images/100dias/dia_019/dia_019_expressao_booleana.png)

Cada saída é uma AND que reconhece **um único valor** da entrada: o bit vale `1` onde a entrada tem `1`, e aparece **barrado** onde a entrada tem `0`. Cada uma dessas ANDs é um **mintermo** (o produto que vale `1` em exatamente uma linha da tabela verdade). Ou seja: o decodificador gera **todos os mintermos** das suas entradas, e por isso qualquer função lógica pode ser montada com um decodificador e uma OR que junta os mintermos certos.

## Diagrama de Circuito

O decodificador 2 para 4 com portas lógicas:

![Decodificador 2 para 4 com portas](/assets/images/100dias/dia_019/dia_019_diagrama_circuito.png)

Os inversores geram as versões barradas de `in_a[1]` e `in_a[0]`, formando quatro "trilhos" verticais, mais o trilho do `en`. Cada AND de 3 entradas pega um trilho de cada bit (direto ou barrado) e o `en`. Para N entradas, são 2ᴺ ANDs de N+1 entradas; em decodificadores grandes (como os de endereço de memória), as ANDs são divididas em etapas para não ficarem largas demais.

---

## Código Verilog

```verilog
// ============================================================================
// VLSI Brasil - 100 Dias de RTL
// Dia 019 - Decodificador N para 2^N (Decoder)
// ----------------------------------------------------------------------------
// Descrição : Converte o número binário in_a (N bits) em um código one-hot:
//             só a saída out[in_a] vale 1, e as outras valem 0.
//             en = 0 -> todas as saídas em 0.
//             Cada saída é uma porta AND que reconhece um valor de in_a
//             (um mintermo).
// ============================================================================

`timescale 1ns / 1ps

module decodificador #(
    parameter N = 3                         // bits de entrada
) (
    input  wire [N-1:0]      in_a,          // código binário
    input  wire              en,            // habilita
    output wire [(1<<N)-1:0] out            // one-hot
);

    // Uma saída por valor possível de in_a
    genvar i;
    generate
        for (i = 0; i < (1 << N); i = i + 1) begin : g_saida
            assign out[i] = en & (in_a == i);
        end
    endgenerate

endmodule
```

O que há de novo aqui:

- **Largura de porta calculada**: `out` tem `(1<<N)` bits, ou seja, 2ᴺ. Mudando só o parâmetro `N`, o mesmo código gera um decodificador 2 para 4, 3 para 8 ou 6 para 64.
- **Comparação com o índice do `generate`**: `in_a == i` compara a entrada com a constante `i` de cada iteração. Para a síntese, uma comparação com constante vira exatamente a AND do mintermo, com os bits barrados onde a constante tem `0`.
- **`&` entre um bit e o resultado de uma comparação**: a comparação devolve um bit (`1` ou `0`), então `en & (in_a == i)` é uma AND de dois bits.

> **Alternativa:** o decodificador inteiro cabe em uma linha: `assign out = en << in_a;`. Deslocar o bit `en` para a posição `in_a` é exatamente a definição do decodificador. A ferramenta de síntese gera o mesmo circuito.

## Testbench

```verilog
// ============================================================================
// VLSI Brasil - 100 Dias de RTL
// Dia 019 - Testbench do Decodificador
// ============================================================================

`timescale 1ns / 1ps

module tb_decodificador;

    parameter N = 3;
    localparam M = 1 << N;                  // número de saídas

    // Sinais do testbench
    reg  [N-1:0] in_a;
    reg          en;
    wire [M-1:0] out;

    reg  [M-1:0] esperado;

    integer i;
    integer testes = 0;
    integer erros  = 0;

    // Instância do circuito sob teste (DUT - Device Under Test)
    decodificador #(.N(N)) dut (
        .in_a (in_a),
        .en   (en),
        .out  (out)
    );

    // Modelo de referência: um 1 deslocado para a posição in_a
    task verifica;
        begin
            esperado = en ? ({{(M-1){1'b0}}, 1'b1} << in_a) : {M{1'b0}};
            testes = testes + 1;
            if (out !== esperado) begin
                $display("ERRO: in_a=%0d en=%b -> out=%b, esperado %b",
                         in_a, en, out, esperado);
                erros = erros + 1;
            end
        end
    endtask

    initial begin
        // Arquivo de formas de onda para o GTKWave
        $dumpfile("tb_decodificador.vcd");
        $dumpvars(0, tb_decodificador);

        // Exibe o tempo em ns
        $timeformat(-9, 0, " ns", 6);

        $display("N = %0d", N);
        $display("------------------------------");
        $display(" tempo  | en in_a | out");
        $display("------------------------------");

        // Teste exaustivo: todas as combinações de en e in_a
        // (com N pequeno, ele também aparece nas formas de onda)
        for (i = 0; i < 2 * M; i = i + 1) begin
            {en, in_a} = i ^ M;             // primeiro en = 1, depois en = 0
            #10;
            if (N <= 4)
                $display(" %t |  %b  %3d | %b", $time, en, in_a, out);
            verifica;
        end

        $display("------------------------------");
        if (erros == 0)
            $display("SUCESSO: %0d testes passaram!", testes);
        else
            $display("FALHA: %0d erro(s) em %0d testes.", erros, testes);

        $finish;
    end

endmodule
```

- **Modelo de referência com deslocamento**: `{{(M-1){1'b0}}, 1'b1} << in_a` cria um vetor `00...01` com `M` bits e desloca o `1` para a posição `in_a`. O vetor é montado explicitamente com `M` bits (a replicação `{(M-1){1'b0}}` seguida de um `1`), o que deixa clara a largura do resultado. Um simples `1 << in_a` também funcionaria aqui, porque a largura do lado esquerdo (`esperado`) entra no cálculo, mas escrever a largura evita surpresas quando a expressão é usada em outro contexto.
- **Ordem dos testes com XOR**: `{en, in_a} = i ^ M` inverte o bit de `en`, para os casos com `en = 1` virem primeiro (e aparecerem nas formas de onda).
- **Exaustivo**: com N = 3 são só 16 combinações; com N = 6, 128. O decodificador é sempre testado por completo.

---

## Simulação

### Diagrama de tempo esperado

Os 8 valores com `en = 1` e dois com `en = 0`:

![Diagrama de tempo esperado](/assets/images/100dias/dia_019/dia_019_diagrama_tempo_esperado.png)

### Rodando no Icarus Verilog

```bash
# compila o projeto e o testbench
iverilog -g2012 -Wall -o tb_decodificador.vvp rtl/decodificador.v rtl/tb_decodificador.v

# executa a simulação
vvp tb_decodificador.vvp
```

A saída no terminal:

```text
VCD info: dumpfile tb_decodificador.vcd opened for output.
N = 3
------------------------------
 tempo  | en in_a | out
------------------------------
  10 ns |  1    0 | 00000001
  20 ns |  1    1 | 00000010
  30 ns |  1    2 | 00000100
  40 ns |  1    3 | 00001000
  50 ns |  1    4 | 00010000
  60 ns |  1    5 | 00100000
  70 ns |  1    6 | 01000000
  80 ns |  1    7 | 10000000
  90 ns |  0    0 | 00000000
 100 ns |  0    1 | 00000000
 110 ns |  0    2 | 00000000
 120 ns |  0    3 | 00000000
 130 ns |  0    4 | 00000000
 140 ns |  0    5 | 00000000
 150 ns |  0    6 | 00000000
 160 ns |  0    7 | 00000000
------------------------------
SUCESSO: 16 testes passaram!
```

O Makefile deste dia usa o parâmetro `N` em vez de `WIDTH` (por exemplo, `make N=6` gera um decodificador 6 para 64):

```bash
iverilog -g2012 -Wall -P tb_decodificador.N=6 -o tb_decodificador.vvp rtl/decodificador.v rtl/tb_decodificador.v
vvp tb_decodificador.vvp
```

```text
N = 6
SUCESSO: 128 testes passaram!
```

### Formas de onda no GTKWave

```bash
gtkwave tb_decodificador.vcd
```

![Resultado da simulação no GTKWave](/assets/images/100dias/dia_019/dia_019_simulacao_gtkwave.png)

A captura mostra os 8 casos com `en = 1`: o `1` de `out` anda uma posição para a esquerda a cada passo.

---

## Resumo

- O **decodificador N para 2ᴺ** acende exatamente a saída de índice `in_a`: converte binário em one-hot.
- Cada saída é uma AND que reconhece um valor (um **mintermo**); o decodificador gera todos os mintermos das entradas.
- Um decodificador é um **demultiplexador** com a entrada de dado ligada ao `en`.
- É usado para endereçar memórias, registradores e periféricos, e decodificar instruções.
- Em Verilog: largura calculada `(1<<N)`, comparação com o índice do `generate`, e a forma compacta `en << in_a`.

No **Dia 020** vamos fazer o caminho inverso: o **codificador de prioridade**, que recebe vários pedidos e diz qual deles atender primeiro. Até amanhã!
