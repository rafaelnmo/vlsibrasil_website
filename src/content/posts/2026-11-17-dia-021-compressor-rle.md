---
title: "Dia 021 - Compressor RLE"
description: "Dia 021 do 100 Dias de RTL: um compressor de dados RLE (Run-Length Encoding) com interface de fluxo valid/last, registradores de estado e um testbench com fila de resultados esperados."
date: 2026-11-17
author: rafael
categories: ["100 Dias de RTL", "Verilog"]
tags: ["RTL", "Verilog", "Sequencial", "Compressão", "RLE", "Streaming", "Icarus Verilog", "GTKWave"]
cover: "/assets/images/100dias/dia_021/dia_021_capa.png"
draft: true
---
Hoje juntamos o que vimos nos últimos dias (registradores, contadores e comparadores) para construir algo com cara de aplicação real: um **compressor de dados**. Vamos implementar o **RLE** (*Run-Length Encoding*, codificação por comprimento de corrida), o algoritmo de compressão mais simples que existe, e ainda assim usado em formatos de imagem (BMP, TGA, PCX), em fax e como etapa de algoritmos maiores. No **Dia 031** vamos construir o descompressor que desfaz o que fizermos hoje.

---

## Descrição

A ideia do RLE é trocar cada **corrida** (uma sequência de bytes iguais seguidos) por um **par**: o byte e quantas vezes ele se repete.

```text
entrada:  A A A A B B B C C D          (10 bytes)
saída:    (A,4) (B,3) (C,2) (D,1)      (4 pares)
```

Nosso compressor trabalha com um **fluxo** (*stream*) de bytes, um por ciclo de clock:

- **`in_valid`** indica que há um byte válido em `in_data` naquele ciclo. Com `in_valid = 0`, o compressor simplesmente espera: o fluxo pode ter intervalos.
- **`in_last`** marca o **último byte** de um fluxo. Sem ele, o compressor nunca saberia que a última corrida terminou (ele poderia estar esperando mais um `D`).
- Na saída, cada par sai com **`out_valid = 1`** durante um ciclo, com o byte em `out_data` e a quantidade em `out_count`.

O contador da corrida tem `CW = 4` bits, então uma corrida tem no máximo **15** bytes. Uma corrida maior é **dividida**: 18 `E`s viram `(E,15)` e `(E,3)`.

### Quando o RLE compensa?

Cada par ocupa 8 + 4 = 12 bits. O exemplo acima tem 10 bytes (80 bits) e vira 4 pares (48 bits): uma economia de 40%. Mas em dados **sem repetições**, cada byte vira um par `(X,1)`, e o resultado fica **50% maior** que a entrada:

![Tamanho original e comprimido](/assets/images/100dias/dia_021/dia_021_expressao_booleana.png)

O RLE só funciona bem em dados com longas corridas, como imagens com grandes áreas de mesma cor. É um bom lembrete de que **nenhum algoritmo de compressão consegue reduzir qualquer dado**.

## Diagrama de Blocos

![Diagrama de blocos do compressor RLE](/assets/images/100dias/dia_021/dia_021_diagrama_blocos.png)

| Sinal       | Direção | Largura | Descrição                                       |
|-------------|---------|---------|-------------------------------------------------|
| `clk`       | entrada | 1 bit   | Clock                                           |
| `rst_n`     | entrada | 1 bit   | Reset assíncrono, ativo em 0                    |
| `in_valid`  | entrada | 1 bit   | Há um byte de entrada neste ciclo               |
| `in_data`   | entrada | DW      | Byte de entrada                                 |
| `in_last`   | entrada | 1 bit   | Último byte do fluxo                            |
| `out_valid` | saída   | 1 bit   | Há um par na saída neste ciclo                  |
| `out_data`  | saída   | DW      | Byte da corrida                                 |
| `out_count` | saída   | CW      | Tamanho da corrida (1 a 2^CW - 1)               |

## Tabela Verdade

Em vez de uma tabela verdade, acompanhamos o fluxo `AAAABBBCCD` **ciclo a ciclo**. As colunas `simbolo` e `contagem` mostram o estado interno **depois** da borda de clock, e `saída` mostra o par que aparece nas saídas registradas nessa mesma borda:

![O fluxo AAAABBBCCD ciclo a ciclo](/assets/images/100dias/dia_021/dia_021_tabela_verdade.png)

- Ciclos 1 a 4: chegam `A`s; a contagem sobe de 1 a 4.
- Ciclo 5: chega um `B`, **diferente** do símbolo atual. O compressor **envia** `(A,4)` e começa uma nova corrida com `B` e contagem 1, tudo na mesma borda.
- Ciclo 10: chega o `D` com `in_last = 1`. O compressor envia `(C,2)` e começa a corrida do `D`.
- Ciclo 11: como o fluxo terminou no ciclo anterior, a última corrida, `(D,1)`, é enviada.

## Diagrama de Circuito

![Compressor RLE: registradores, comparadores e controle](/assets/images/100dias/dia_021/dia_021_diagrama_circuito.png)

O compressor tem:

- dois **registradores de estado**: `simbolo` (o byte da corrida atual) e `contagem` (um contador como o do Dia 017, que pode também voltar para 1);
- dois **comparadores** (Dia 012): o byte que chegou é **igual** ao símbolo? A contagem ainda **cabe** (é diferente de 15)?
- uma lógica de **controle**, que decide a cada ciclo: **continuar** a corrida (`contagem + 1`), ou **emitir** o par e começar uma nova corrida;
- os **registradores de saída**, que guardam o par emitido por um ciclo.

O registrador `fim` (não desenhado) lembra que o fluxo terminou no ciclo anterior, para enviar a última corrida.

---

## Código Verilog

```verilog
// ============================================================================
// VLSI Brasil - 100 Dias de RTL
// Dia 021 - Compressor RLE (Run-Length Encoding)
// ----------------------------------------------------------------------------
// Descrição : Recebe um fluxo de bytes (um por ciclo, quando in_valid = 1) e
//             substitui cada sequência de bytes iguais (uma "corrida") pelo
//             par (byte, quantidade).
//             Exemplo: A A A A B B C  ->  (A,4) (B,2) (C,1)
//             - in_last = 1 marca o último byte do fluxo: a corrida em
//               andamento é enviada no ciclo seguinte.
//             - Uma corrida tem no máximo 2^CW - 1 bytes; uma corrida maior
//               é dividida em pares de no máximo esse tamanho.
//             - As saídas são registradas: cada par sai com out_valid = 1
//               durante um ciclo.
// ============================================================================

`timescale 1ns / 1ps

module compressor_rle #(
    parameter DW = 8,                       // largura do dado (byte)
    parameter CW = 4                        // largura do contador da corrida
) (
    input  wire          clk,               // clock
    input  wire          rst_n,             // reset assíncrono, ativo em 0
    input  wire          in_valid,          // há um byte de entrada
    input  wire [DW-1:0] in_data,           // byte de entrada
    input  wire          in_last,           // último byte do fluxo
    output reg           out_valid,         // há um par na saída
    output reg  [DW-1:0] out_data,          // byte da corrida
    output reg  [CW-1:0] out_count          // tamanho da corrida
);

    localparam [CW-1:0] MAX = {CW{1'b1}};   // maior corrida

    // Estado: a corrida em andamento
    reg [DW-1:0] simbolo;                   // byte que está se repetindo
    reg [CW-1:0] contagem;                  // quantas vezes até agora
    reg          ativo;                     // há uma corrida em andamento
    reg          fim;                       // o fluxo terminou no ciclo anterior

    // A corrida atual continua se chegar o mesmo byte e ainda couber
    wire continua = ativo && !fim && (in_data == simbolo) && (contagem != MAX);

    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            simbolo   <= {DW{1'b0}};
            contagem  <= {CW{1'b0}};
            ativo     <= 1'b0;
            fim       <= 1'b0;
            out_valid <= 1'b0;
            out_data  <= {DW{1'b0}};
            out_count <= {CW{1'b0}};
        end else begin
            out_valid <= 1'b0;              // por padrão, nada na saída

            // Fim do fluxo no ciclo anterior: envia a última corrida
            if (fim) begin
                out_valid <= 1'b1;
                out_data  <= simbolo;
                out_count <= contagem;
                ativo     <= 1'b0;
            end

            if (in_valid) begin
                if (continua) begin
                    contagem <= contagem + 1'b1;
                end else begin
                    // Byte diferente (ou corrida cheia): envia a corrida
                    // anterior, se houver, e começa uma nova
                    if (ativo && !fim) begin
                        out_valid <= 1'b1;
                        out_data  <= simbolo;
                        out_count <= contagem;
                    end
                    simbolo  <= in_data;
                    contagem <= 1;
                    ativo    <= 1'b1;
                end
            end

            fim <= in_valid && in_last;
        end
    end

endmodule
```

O que há de novo aqui:

- **Vários registradores em um único `always`**: `simbolo`, `contagem`, `ativo`, `fim` e as três saídas são todos atualizados no mesmo bloco, na mesma borda. Como todos usam `<=`, cada um é calculado com os valores **de antes** da borda: por exemplo, o par emitido usa o `simbolo` antigo, mesmo que o `simbolo` receba o byte novo na mesma borda.
- **Valor padrão no início do bloco**: `out_valid <= 1'b0;` no começo do `else` garante que `out_valid` volta a `0` em todo ciclo em que nada é emitido. Se um `if` mais abaixo atribuir `1`, essa atribuição vence, porque **a última atribuição** a um registrador em uma borda é a que vale (a mesma regra do Dia 020, agora com `<=`).
- **Sinal combinacional a partir de registradores**: `continua` é um `wire` calculado com o estado atual e a entrada. Separar essa condição deixa o bloco `always` mais legível.
- **Dois parâmetros**: `DW` (largura do dado) e `CW` (largura do contador), e um `localparam MAX` calculado a partir de `CW`.
- **Uma interface de fluxo**: os sinais `valid`/`last` são o padrão de interfaces de streaming como o **AXI4-Stream** (que tem `TVALID`, `TDATA` e `TLAST`). Nossa versão não tem `ready`: o compressor precisa aceitar um byte por ciclo, e quem recebe a saída precisa aceitar um par por ciclo. Interfaces com *backpressure* (`ready`) virão mais adiante no desafio.

## Testbench

```verilog
// ============================================================================
// VLSI Brasil - 100 Dias de RTL
// Dia 021 - Testbench do Compressor RLE
// ============================================================================

`timescale 1ns / 1ps

module tb_compressor_rle;

    parameter DW = 8;
    parameter CW = 4;
    localparam MAX = (1 << CW) - 1;

    // Sinais do testbench
    reg           clk = 1'b0;
    reg           rst_n;
    reg           in_valid = 1'b0;
    reg  [DW-1:0] in_data  = 0;
    reg           in_last  = 1'b0;
    wire          out_valid;
    wire [DW-1:0] out_data;
    wire [CW-1:0] out_count;

    // Modelo de referência: um RLE em software, que guarda os pares
    // esperados numa fila (escritos em wr, lidos em rd)
    reg  [DW-1:0] fila_data  [0:8191];
    reg  [CW-1:0] fila_count [0:8191];
    integer wr = 0, rd = 0;
    reg  [DW-1:0] ref_simbolo;
    integer       ref_contagem = 0;

    integer i, n;
    integer bytes_in = 0;
    integer erros    = 0;
    reg     mostrar  = 1'b1;            // mostra os pares no terminal

    // Instância do circuito sob teste (DUT - Device Under Test)
    compressor_rle #(.DW(DW), .CW(CW)) dut (
        .clk       (clk),
        .rst_n     (rst_n),
        .in_valid  (in_valid),
        .in_data   (in_data),
        .in_last   (in_last),
        .out_valid (out_valid),
        .out_data  (out_data),
        .out_count (out_count)
    );

    // Gerador de clock: período de 10 ns
    always #5 clk = ~clk;

    // Coloca um par na fila de pares esperados
    task empilha(input [DW-1:0] d, input integer c);
        begin
            fila_data[wr]  = d;
            fila_count[wr] = c;
            wr = wr + 1;
        end
    endtask

    // Envia um byte ao DUT (durante um ciclo) e atualiza o modelo
    task envia(input [DW-1:0] d, input last);
        begin
            in_valid = 1'b1; in_data = d; in_last = last;
            bytes_in = bytes_in + 1;
            if (ref_contagem > 0 && d == ref_simbolo && ref_contagem != MAX) begin
                ref_contagem = ref_contagem + 1;
            end else begin
                if (ref_contagem > 0)
                    empilha(ref_simbolo, ref_contagem);
                ref_simbolo  = d;
                ref_contagem = 1;
            end
            if (last) begin
                empilha(ref_simbolo, ref_contagem);
                ref_contagem = 0;
            end
            @(posedge clk); #1;
            in_valid = 1'b0; in_last = 1'b0;
        end
    endtask

    // Ciclos sem dados
    task espera(input integer c);
        begin
            repeat (c) begin
                @(posedge clk); #1;
            end
        end
    endtask

    // Envia uma string de caracteres como um fluxo (o último é in_last)
    task envia_texto(input [8*32-1:0] txt, input integer tam);
        integer k;
        begin
            for (k = tam - 1; k >= 0; k = k - 1)
                envia(txt[8*k +: 8], k == 0);
        end
    endtask

    // Verificador: compara cada par de saída com o próximo da fila
    always @(negedge clk) begin
        if (out_valid) begin
            if (mostrar)
                $display(" %t | ('%c', %2d)", $time, out_data, out_count);
            if (rd >= wr || out_data !== fila_data[rd] || out_count !== fila_count[rd]) begin
                $display("ERRO: t=%0t par (%0d, %0d), esperado (%0d, %0d)",
                         $time, out_data, out_count, fila_data[rd], fila_count[rd]);
                erros = erros + 1;
            end
            rd = rd + 1;
        end
    end

    initial begin
        // Arquivo de formas de onda para o GTKWave
        $dumpfile("tb_compressor_rle.vcd");
        $dumpvars(0, tb_compressor_rle);

        // Exibe o tempo em ns
        $timeformat(-9, 0, " ns", 6);

        $display("DW = %0d, CW = %0d (corrida máxima = %0d)", DW, CW, MAX);
        $display("-----------------------------");
        $display(" tempo  | par de saída");
        $display("-----------------------------");

        rst_n = 1'b0;
        #12 rst_n = 1'b1;
        @(posedge clk); #1;

        // Parte 1: testes dirigidos (aparecem nas formas de onda)
        envia_texto("AAAABBBCCD", 10);      // o exemplo do post
        espera(2);
        envia_texto("EEEEEEEEEEEEEEEEEE", 18);  // 18 > 15: corrida dividida
        envia("F", 0);                      // fluxo com intervalos:
        envia("F", 0);                      // in_valid fica em 0 entre
        espera(2);                          // os bytes, e a corrida continua
        envia("F", 0);
        envia("G", 1);
        espera(3);

        // Parte 2: 3000 bytes aleatórios (fora das formas de onda)
        $dumpoff;
        mostrar = 1'b0;
        for (i = 0; i < 3000; i = i + 1) begin
            n = $random & 7;
            // alfabeto pequeno (A, B ou C) para formar corridas
            envia("A" + ($unsigned($random) % 3), (n == 0));
            if (($random & 7) == 0)
                espera(1);                  // intervalos ocasionais
        end
        envia("Z", 1);                      // fecha o último fluxo
        espera(3);

        $display("-----------------------------");
        if (rd != wr) begin
            $display("ERRO: %0d pares esperados, %0d recebidos", wr, rd);
            erros = erros + 1;
        end
        if (erros == 0)
            $display("SUCESSO: %0d bytes comprimidos em %0d pares, sem erros!",
                     bytes_in, rd);
        else
            $display("FALHA: %0d erro(s).", erros);

        $finish;
    end

endmodule
```

Este é o testbench mais elaborado até agora:

- **Fila de resultados esperados**: as memórias `fila_data` e `fila_count` guardam os pares que o compressor **deveria** produzir, na ordem. A `task envia` alimenta o DUT e, ao mesmo tempo, roda um **RLE em software** que empilha os pares esperados. O verificador (`always @(negedge clk)`) compara cada par que sai do DUT com o próximo da fila.
- **Contagem no final**: além de cada par estar certo, o número total de pares precisa bater (`rd == wr`). Isso pega erros como um par que nunca saiu.
- **Strings como vetores**: em Verilog, `"AAAABBBCCD"` é um vetor de 8 bits por caractere. A `task envia_texto` recebe a string em um vetor de 256 bits e envia os caracteres um a um, do primeiro ao último (o primeiro caractere está nos bits mais altos).
- **`%c`** mostra um byte como caractere no `$display`.
- **Testes aleatórios realistas**: 3000 bytes de um alfabeto pequeno (`A`, `B` ou `C`, para formar corridas), com intervalos (`in_valid = 0`) e fins de fluxo aleatórios.

---

## Simulação

### Diagrama de tempo esperado

O fluxo `AAAABBBCCD`, um byte por ciclo. Cada par aparece na saída **um ciclo depois** do byte que encerrou a corrida, porque as saídas são registradas:

![Diagrama de tempo esperado](/assets/images/100dias/dia_021/dia_021_diagrama_tempo_esperado.png)

### Rodando no Icarus Verilog

```bash
# compila o projeto e o testbench
iverilog -g2012 -Wall -o tb_compressor_rle.vvp rtl/compressor_rle.v rtl/tb_compressor_rle.v

# executa a simulação
vvp tb_compressor_rle.vvp
```

A saída no terminal mostra os pares dos testes dirigidos (os aleatórios são verificados sem imprimir):

```text
VCD info: dumpfile tb_compressor_rle.vcd opened for output.
DW = 8, CW = 4 (corrida máxima = 15)
-----------------------------
 tempo  | par de saída
-----------------------------
  70 ns | ('A',  4)
 100 ns | ('B',  3)
 120 ns | ('C',  2)
 130 ns | ('D',  1)
 300 ns | ('E', 15)
 330 ns | ('E',  3)
 380 ns | ('F',  3)
 390 ns | ('G',  1)
-----------------------------
SUCESSO: 3033 bytes comprimidos em 2161 pares, sem erros!
```

Repare nos três fluxos dirigidos: `AAAABBBCCD`, a corrida de 18 `E`s dividida em `(E,15)` e `(E,3)`, e `FF_F` com intervalos, que continua sendo uma corrida só, `(F,3)`.

E a última linha confirma o que vimos na descrição: com dados aleatórios de 3 símbolos, as corridas são curtas, e **3033 bytes viraram 2161 pares**, ou 25.932 bits contra 24.264 da entrada. O "comprimido" ficou **maior**!

Com um contador de 3 bits (corridas de até 7):

```bash
iverilog -g2012 -Wall -P tb_compressor_rle.CW=3 -o tb_compressor_rle.vvp rtl/compressor_rle.v rtl/tb_compressor_rle.v
vvp tb_compressor_rle.vvp
```

```text
DW = 8, CW = 3 (corrida máxima = 7)
SUCESSO: 3033 bytes comprimidos em 2162 pares, sem erros!
```

### Formas de onda no GTKWave

```bash
gtkwave tb_compressor_rle.vcd
```

![Resultado da simulação no GTKWave](/assets/images/100dias/dia_021/dia_021_simulacao_gtkwave.png)

Os bytes aparecem em hexadecimal: `41` é o código ASCII de `A`, `42` de `B`, e assim por diante.

> **Dica:** no GTKWave, selecione `in_data` e `out_data` e use o botão direito → **Data Format** → **ASCII** para ver os caracteres.

---

## Resumo

- O **RLE** troca cada corrida de bytes iguais por um par (byte, quantidade).
- Ele só comprime dados com corridas longas; em dados sem repetição, a saída fica até 50% maior.
- O compressor é um circuito sequencial com registradores de estado (`simbolo`, `contagem`), comparadores e uma lógica de controle que decide entre **continuar** e **emitir**.
- `in_valid`/`in_last` formam uma interface de fluxo, no estilo do AXI4-Stream.
- Em Verilog: vários registradores em um `always`, valor padrão com `<=` no início do bloco, e no testbench uma fila de resultados esperados, strings como vetores e `%c`.

No **Dia 022** vamos juntar muitos dos blocos que construímos até aqui em um circuito só: a **ALU** (*Arithmetic Logic Unit*), o coração de um processador. Até amanhã!
