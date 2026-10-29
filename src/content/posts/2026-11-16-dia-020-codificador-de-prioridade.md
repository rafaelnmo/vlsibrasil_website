---
title: "Dia 020 - Codificador de Prioridade"
description: "Dia 020 do 100 Dias de RTL: o codificador de prioridade, com entradas 'não importa' na tabela verdade e um laço for em lógica combinacional no Verilog."
date: 2026-11-16
author: rafael
categories: ["100 Dias de RTL", "Verilog"]
tags: ["RTL", "Verilog", "Combinacional", "Codificador", "Icarus Verilog", "GTKWave"]
cover: "/assets/images/100dias/dia_020/dia_020_capa.png"
draft: true
---
Ontem o decodificador transformou um número em um código one-hot. Hoje fazemos o caminho inverso: o **codificador** recebe várias linhas e devolve, em binário, **qual delas está ativa**. E como no mundo real várias linhas podem estar ativas ao mesmo tempo, vamos construir a versão mais útil: o **codificador de prioridade**, que escolhe a de maior prioridade.

---

## Descrição

Imagine 8 periféricos que podem pedir a atenção de um processador (um teclado, um timer, uma placa de rede...). Cada um tem uma linha de pedido, e o processador quer saber **qual atender primeiro**. O codificador de prioridade recebe os 8 pedidos em `in_a` e responde:

- **`out`**: o **índice** do pedido de maior prioridade, em binário (3 bits para 8 entradas). Aqui, quanto maior o índice, maior a prioridade.
- **`valid`**: `1` se há **algum** pedido. Sem ele, não daria para distinguir "o pedido 0 está ativo" de "não há nenhum pedido", pois os dois casos dão `out = 0`.

```text
in_a = 0010 1100   (pedidos 5, 3 e 2)   ->  out = 5 (101), valid = 1
in_a = 0000 0000   (nenhum pedido)      ->  out = 0,       valid = 0
```

### Codificador simples e codificador de prioridade

Se garantirmos que **só um** bit da entrada vale `1` (uma entrada one-hot), um codificador simples resolve com poucas ORs: `out[0]` é a OR das entradas de índice ímpar, `out[1]` a das entradas com o bit 1 do índice em `1`, e assim por diante. Mas se dois bits estiverem ativos, o resultado vira uma mistura sem sentido (os pedidos 1 e 2 dariam `out = 3`!).

O codificador de prioridade resolve isso: os pedidos de menor prioridade são **ignorados** quando há um maior ativo. Isso aparece na tabela verdade como **"não importa"** (*don't care*, `x`).

## Diagrama de Blocos

![Diagrama de blocos do codificador de prioridade](/assets/images/100dias/dia_020/dia_020_diagrama_blocos.png)

| Sinal   | Direção | Largura | Descrição                                     |
|---------|---------|---------|-----------------------------------------------|
| `in_a`  | entrada | 2ᴺ      | Pedidos (bit `i` = pedido `i`)                |
| `out`   | saída   | N       | Índice do pedido de maior prioridade          |
| `valid` | saída   | 1 bit   | Há pelo menos um pedido                       |

## Tabela Verdade

O codificador de prioridade 4 para 2:

![Tabela verdade do codificador de prioridade 4 para 2](/assets/images/100dias/dia_020/dia_020_tabela_verdade.png)

Em vez de 16 linhas, bastam 5: o `x` diz que aquele bit **não importa**, porque já existe um pedido de maior prioridade. A última linha, por exemplo, resume 8 combinações: sempre que `in[3] = 1`, a resposta é 3, não importa o resto.

## Mapa de Karnaugh

![Mapas de Karnaugh do codificador de prioridade 4 para 2](/assets/images/100dias/dia_020/dia_020_mapa_karnaugh.png)

- **`out[1]`**: dois grupos de 8, as linhas com `in[2] = 1` (azul) e com `in[3] = 1` (verde). Resultado: `in[3] + in[2]`.
- **`out[0]`**: as duas linhas de baixo (`in[3] = 1`, azul) e mais um grupo de 4, onde `in[2] = 0` e `in[1] = 1`. Esse grupo ocupa as linhas `00` e `10`, que são **vizinhas no mapa** porque as bordas se "dobram" (o código Gray dá a volta). No desenho ele aparece partido em dois pedaços, um em cima e um embaixo.

## Expressões Booleanas

![Expressões do codificador de prioridade 4 para 2](/assets/images/100dias/dia_020/dia_020_expressao_booleana.png)

Repare como a prioridade aparece em `out[0]`: o pedido 1 só conta se o pedido 2 **não** estiver ativo (`in[2]` barrado). O pedido 3 não precisa dessa condição, porque é o de maior prioridade.

## Diagrama de Circuito

![Codificador de prioridade 4 para 2](/assets/images/100dias/dia_020/dia_020_diagrama_circuito.png)

Para 4 entradas, o circuito é pequeno. Para muitas entradas, a "corrente" de condições cresce (o pedido 0 só conta se nenhum dos outros estiver ativo), e codificadores grandes são montados em **árvore**, com codificadores menores e um codificador que escolhe entre os grupos, a mesma ideia de dividir para conquistar dos Dias 009 e 010.

---

## Código Verilog

```verilog
// ============================================================================
// VLSI Brasil - 100 Dias de RTL
// Dia 020 - Codificador de Prioridade 2^N para N (Priority Encoder)
// ----------------------------------------------------------------------------
// Descrição : Devolve em out o índice do bit em 1 de MAIOR posição de in_a.
//             valid = 1 se algum bit de in_a vale 1. Com in_a = 0, valid = 0
//             e out = 0.
//             Exemplo (N = 3): in_a = 0010_1100 -> out = 5, valid = 1
// ============================================================================

`timescale 1ns / 1ps

module codificador #(
    parameter N = 3                         // bits de saída
) (
    input  wire [(1<<N)-1:0] in_a,          // pedidos
    output reg  [N-1:0]      out,           // índice do pedido vencedor
    output wire              valid          // há algum pedido
);

    assign valid = |in_a;                   // OR de redução

    // Percorre do bit 0 ao bit mais alto: cada bit em 1 encontrado
    // sobrescreve o anterior, então o último (o de maior índice) vence
    integer i;
    always @(*) begin
        out = {N{1'b0}};
        for (i = 0; i < (1 << N); i = i + 1)
            if (in_a[i])
                out = i;
    end

endmodule
```

O que há de novo aqui:

- **Laço `for` em lógica combinacional**: dentro de um `always @(*)`, o `for` não é executado ao longo do tempo; ele é **desenrolado** pela síntese, gerando uma cópia da lógica para cada iteração.
- **A última atribuição vence**: em um bloco `always`, se a mesma variável recebe vários valores, vale o último. O laço percorre os bits do 0 ao mais alto, e cada bit em `1` sobrescreve o resultado anterior; no fim, sobra o de **maior índice**. É um jeito compacto e genérico de descrever prioridade, que a síntese transforma numa cadeia de muxes.
- **Valor padrão antes do laço**: `out = {N{1'b0}};` garante que `out` sempre recebe um valor, mesmo sem nenhum pedido. Sem isso, a síntese inferiria um **latch** (Dia 003).
- **`integer i` no módulo**: a variável do laço é declarada como `integer`. Ela não vira hardware; serve só para o laço ser desenrolado.
- **OR de redução**: `|in_a` vale `1` se qualquer bit de `in_a` vale `1`. É o `valid`.

> **Alternativa com `casez`:** para um N fixo, o codificador pode ser escrito com `casez` e `?` como "não importa" (`8'b1???????: out = 7;`), espelhando a tabela verdade. A versão com `for` tem a vantagem de funcionar para qualquer N.

## Testbench

```verilog
// ============================================================================
// VLSI Brasil - 100 Dias de RTL
// Dia 020 - Testbench do Codificador de Prioridade
// ============================================================================

`timescale 1ns / 1ps

module tb_codificador;

    parameter N = 3;
    localparam M = 1 << N;                  // número de entradas

    // Sinais do testbench
    reg  [M-1:0] in_a;
    wire [N-1:0] out;
    wire         valid;

    reg  [N-1:0] esperado;
    reg          valid_esperado;

    integer i, j;
    integer testes = 0;
    integer erros  = 0;

    // Instância do circuito sob teste (DUT - Device Under Test)
    codificador #(.N(N)) dut (
        .in_a  (in_a),
        .out   (out),
        .valid (valid)
    );

    // Modelo de referência: procura o primeiro 1 a partir do bit mais alto
    // (o laço na ordem oposta à do DUT)
    task verifica;
        begin
            valid_esperado = 1'b0;
            esperado       = {N{1'b0}};
            for (j = M - 1; j >= 0; j = j - 1)
                if (in_a[j] && !valid_esperado) begin
                    esperado       = j;
                    valid_esperado = 1'b1;
                end
            testes = testes + 1;
            if (out !== esperado || valid !== valid_esperado) begin
                $display("ERRO: in_a=%b -> out=%0d valid=%b, esperado %0d %b",
                         in_a, out, valid, esperado, valid_esperado);
                erros = erros + 1;
            end
        end
    endtask

    task aplica(input [M-1:0] a);
        begin
            in_a = a;
            #10;
            $display(" %t | %b |  %0d    %b", $time, in_a, out, valid);
            verifica;
        end
    endtask

    initial begin
        // Arquivo de formas de onda para o GTKWave
        $dumpfile("tb_codificador.vcd");
        $dumpvars(0, tb_codificador);

        // Exibe o tempo em ns
        $timeformat(-9, 0, " ns", 6);

        $display("N = %0d", N);
        $display("-----------------------------------");
        $display(" tempo  | in_a     | out valid");
        $display("-----------------------------------");

        // Parte 1: testes dirigidos (aparecem nas formas de onda)
        aplica(0);                          // nenhum pedido: valid = 0
        aplica(1);                          // só o bit 0
        aplica(8'b0000_1000);               // um bit só (one-hot)
        aplica(8'b0010_1100);               // vários: vence o bit 5
        aplica(8'b1111_1111);               // todos: vence o mais alto
        aplica(8'b1000_0001);               // os dois extremos

        // Parte 2: testes fora das formas de onda
        $dumpoff;
        if (M <= 16) begin
            // Teste exaustivo: todas as 2^M combinações
            for (i = 0; i < (1 << M); i = i + 1) begin
                in_a = i;
                #10;
                verifica;
            end
        end else begin
            // 1000 testes aleatórios com poucos bits em 1
            // (AND de três valores aleatórios), para variar o vencedor
            for (i = 0; i < 1000; i = i + 1) begin
                in_a = {$random, $random} & {$random, $random} & {$random, $random};
                #10;
                verifica;
            end
        end

        $display("-----------------------------------");
        if (erros == 0)
            $display("SUCESSO: %0d testes passaram!", testes);
        else
            $display("FALHA: %0d erro(s) em %0d testes.", erros, testes);

        $finish;
    end

endmodule
```

- **Modelo de referência com o laço ao contrário**: em vez de copiar o laço do DUT, o testbench procura **a partir do bit mais alto** e para no primeiro `1` que encontra. É outra forma de expressar a mesma regra, o que torna a verificação mais forte: um erro na lógica do DUT dificilmente se repetiria em uma descrição diferente.
- **Exaustivo até 16 entradas**: com N = 3 são 256 casos; com N = 4, 65.536.
- **Testes aleatórios com poucos bits em `1`**: com 32 ou 64 entradas aleatórias, quase sempre o bit mais alto estaria em `1` e o resultado seria sempre o mesmo. Fazendo a AND de três valores aleatórios, cada bit fica em `1` só 1/8 das vezes, e o vencedor varia.

---

## Simulação

### Diagrama de tempo esperado

![Diagrama de tempo esperado](/assets/images/100dias/dia_020/dia_020_diagrama_tempo_esperado.png)

### Rodando no Icarus Verilog

```bash
# compila o projeto e o testbench
iverilog -g2012 -Wall -o tb_codificador.vvp rtl/codificador.v rtl/tb_codificador.v

# executa a simulação
vvp tb_codificador.vvp
```

A saída no terminal:

```text
VCD info: dumpfile tb_codificador.vcd opened for output.
N = 3
-----------------------------------
 tempo  | in_a     | out valid
-----------------------------------
  10 ns | 00000000 |  0    0
  20 ns | 00000001 |  0    1
  30 ns | 00001000 |  3    1
  40 ns | 00101100 |  5    1
  50 ns | 11111111 |  7    1
  60 ns | 10000001 |  7    1
-----------------------------------
SUCESSO: 262 testes passaram!
```

Com N = 6 (64 entradas):

```bash
iverilog -g2012 -Wall -P tb_codificador.N=6 -o tb_codificador.vvp rtl/codificador.v rtl/tb_codificador.v
vvp tb_codificador.vvp
```

```text
N = 6
SUCESSO: 1006 testes passaram!
```

### Formas de onda no GTKWave

```bash
gtkwave tb_codificador.vcd
```

![Resultado da simulação no GTKWave](/assets/images/100dias/dia_020/dia_020_simulacao_gtkwave.png)

---

## Resumo

- O **codificador** faz o inverso do decodificador: de várias linhas para um índice binário.
- O **codificador de prioridade** devolve o índice do pedido de maior prioridade, e `valid` indica se há algum pedido.
- Na tabela verdade, os pedidos de menor prioridade viram **"não importa"** (`x`).
- É usado em controladores de interrupção, árbitros de barramento e para encontrar o primeiro `1` de um número (por exemplo, na normalização de números em ponto flutuante).
- Em Verilog: laço `for` em `always @(*)`, "a última atribuição vence" e o OR de redução `|`.

No **Dia 021** voltamos aos circuitos com clock para fazer algo bem prático: um **compressor de dados RLE**, que troca sequências de bytes repetidos por pares (byte, quantidade). Até amanhã!
