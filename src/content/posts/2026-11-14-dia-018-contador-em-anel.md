---
title: "Dia 018 - Contador em Anel"
description: "Dia 018 do 100 Dias de RTL: o contador em anel e o contador Johnson, registradores de deslocamento fechados em anel, com um testbench que verifica os dois ao mesmo tempo."
date: 2026-11-14
author: rafael
categories: ["100 Dias de RTL", "Verilog"]
tags: ["RTL", "Verilog", "Sequencial", "Contador", "Registrador de Deslocamento", "Icarus Verilog", "GTKWave"]
cover: "/assets/images/100dias/dia_018/dia_018_capa.png"
draft: true
---
Ontem o contador guardava um número binário e somava 1 a cada clock. Hoje vamos contar de outro jeito: sem somador nenhum, só com flip-flops ligados em fila e fechados em **anel**. Um único `1` fica girando pelos bits, um passo por clock. É o **contador em anel** (*ring counter*), e de brinde vamos ver seu primo, o **contador Johnson**, que dobra o número de estados com um único inversor.

---

## Descrição

### Contador em anel

Pegue `WIDTH` flip-flops e ligue a saída de cada um na entrada do próximo: isso é um **registrador de deslocamento** (*shift register*), em que os bits andam uma posição a cada clock. Agora ligue a saída do último na entrada do primeiro: o que sai por um lado volta pelo outro. É uma **rotação** (Dia 014), só que de uma posição por clock.

Se o registrador começar com um único `1` (`0001`), esse `1` vai girar:

```text
0001 -> 0010 -> 0100 -> 1000 -> 0001 -> ...
```

Com 4 flip-flops, o contador tem **4 estados**, e em cada um **exatamente um bit** vale `1`. Esse formato é a codificação **one-hot**, a mesma que veremos amanhã na saída do decodificador. Ela é muito útil para controlar sequências: cada flip-flop pode habilitar diretamente uma etapa de uma tarefa (etapa 0, 1, 2, 3, 0, 1, ...), sem precisar de nenhuma lógica para decodificar o estado.

O preço é a eficiência: com 4 flip-flops, um contador binário tem 16 estados, e o anel só tem 4.

### Contador Johnson

Uma pequena mudança melhora isso: em vez de devolver o MSB para o LSB, devolvemos o MSB **invertido**. Começando de `0000`, entram `1`s pela direita até encher, e depois entram `0`s até esvaziar:

```text
0000 -> 0001 -> 0011 -> 0111 -> 1111 -> 1110 -> 1100 -> 1000 -> 0000 -> ...
```

São **2·WIDTH = 8 estados** com os mesmos 4 flip-flops. E a passagem de um estado para o próximo muda **um único bit** por vez, o que evita transições intermediárias erradas ao decodificar o estado e reduz o consumo. Cada estado pode ser reconhecido com uma única porta AND de **2 entradas**, olhando o "par de fronteira" entre os `1`s e os `0`s.

## Diagrama de Blocos

![Diagrama de blocos do contador em anel](/assets/images/100dias/dia_018/dia_018_diagrama_blocos.png)

| Sinal   | Direção | Largura | Descrição                                     |
|---------|---------|---------|-----------------------------------------------|
| `clk`   | entrada | 1 bit   | Clock                                         |
| `rst_n` | entrada | 1 bit   | Reset assíncrono, ativo em 0                  |
| `en`    | entrada | 1 bit   | Habilita o deslocamento                       |
| `q`     | saída   | WIDTH   | Estado atual                                  |

O mesmo módulo implementa os dois contadores, escolhidos pelo parâmetro `JOHNSON` (`0` = anel, `1` = Johnson).

## Tabela Verdade

A sequência de estados dos dois contadores, a partir do reset:

![Sequência de estados do anel e do Johnson](/assets/images/100dias/dia_018/dia_018_tabela_verdade.png)

O anel volta ao início no passo 4; o Johnson, só no passo 8.

## Expressões

![Próximo estado dos dois contadores](/assets/images/100dias/dia_018/dia_018_expressao_booleana.png)

- Nos dois casos, o próximo estado é o atual **deslocado uma posição** para a esquerda, e só muda o bit que entra pela direita: `q[3]` no anel, `~q[3]` no Johnson.
- A terceira linha mostra a decodificação de um estado do Johnson: o passo 2 (`0011`) é o único em que `q[2] = 0` e `q[1] = 1`. Uma AND de 2 entradas basta, qualquer que seja o número de flip-flops.

## Diagrama de Circuito

![Quatro flip-flops em anel](/assets/images/100dias/dia_018/dia_018_diagrama_circuito.png)

Quatro flip-flops em fila, com clock e reset comuns. A saída de `q[3]` volta para a entrada de `q[0]`, diretamente (anel) ou passando por um inversor (Johnson). **Não há nenhuma lógica entre os flip-flops**: o caminho mais longo é de um flip-flop direto para o próximo. Por isso contadores em anel e Johnson funcionam em frequências altíssimas.

> **Cuidado com estados ilegais:** se, por um ruído ou erro, o anel ficar com dois `1`s (`0101`) ou nenhum (`0000`), ele fica preso para sempre numa sequência errada, pois o circuito só desloca o que tem. O mesmo vale para o Johnson (`0101` não está na sequência). Por isso o **reset** é obrigatório para colocar o contador num estado válido. Versões mais robustas adicionam lógica de **autocorreção**, que detecta e corrige estados ilegais.

---

## Código Verilog

```verilog
// ============================================================================
// VLSI Brasil - 100 Dias de RTL
// Dia 018 - Contador em Anel e Contador Johnson (Ring Counter)
// ----------------------------------------------------------------------------
// Descrição : Registrador de deslocamento fechado em anel. A cada borda de
//             subida do clock (com en = 1), os bits andam uma posição para a
//             esquerda e o MSB volta para o LSB.
//             JOHNSON = 0 -> contador em anel: reset em 00...01, um único 1
//                            circula (one-hot), WIDTH estados
//             JOHNSON = 1 -> contador Johnson: reset em 00...00, o MSB volta
//                            INVERTIDO, 2*WIDTH estados
// ============================================================================

`timescale 1ns / 1ps

module contador_anel #(
    parameter WIDTH   = 4,              // número de flip-flops
    parameter JOHNSON = 0               // 0: anel, 1: Johnson
) (
    input  wire             clk,        // clock
    input  wire             rst_n,      // reset assíncrono, ativo em 0
    input  wire             en,         // habilita o deslocamento
    output reg  [WIDTH-1:0] q           // estado
);

    // Valor de reset: um único 1 (anel) ou tudo zero (Johnson)
    localparam [WIDTH-1:0] INICIO = JOHNSON ? {WIDTH{1'b0}} : 1;

    // Bit que entra no LSB: o MSB (anel) ou o MSB invertido (Johnson)
    wire volta = JOHNSON ? ~q[WIDTH-1] : q[WIDTH-1];

    always @(posedge clk or negedge rst_n) begin
        if (!rst_n)
            q <= INICIO;
        else if (en)
            q <= {q[WIDTH-2:0], volta};     // desloca à esquerda, fecha o anel
    end

endmodule
```

O que há de novo aqui:

- **Um parâmetro que muda a função do módulo**: `JOHNSON` não muda uma largura, muda o **comportamento**. Como é uma constante conhecida na elaboração, os operadores `?:` com `JOHNSON` são resolvidos antes da síntese: com `JOHNSON = 0`, o inversor nem existe no hardware.
- **`localparam` calculado a partir de um parâmetro**: `INICIO` é o valor de reset, `0001` ou `0000` dependendo do tipo.
- **Deslocamento com concatenação**: `{q[WIDTH-2:0], volta}` descarta o MSB, anda com os outros bits uma posição para a esquerda e coloca `volta` no LSB. Em um bloco com clock, isso descreve um registrador de deslocamento.
- **Constante sem tamanho**: em `JOHNSON ? {WIDTH{1'b0}} : 1`, o `1` é estendido com zeros até `WIDTH` bits ao ser atribuído ao `localparam`, resultando em `00...01`.

## Testbench

Este testbench instancia **dois DUTs ao mesmo tempo**, o mesmo módulo com `JOHNSON = 0` e com `JOHNSON = 1`, ligados aos mesmos clock, reset e enable:

```verilog
// ============================================================================
// VLSI Brasil - 100 Dias de RTL
// Dia 018 - Testbench do Contador em Anel e do Contador Johnson
// ============================================================================

`timescale 1ns / 1ps

module tb_contador_anel;

    parameter WIDTH = 4;

    // Sinais do testbench
    reg              clk = 1'b0;
    reg              rst_n;
    reg              en;
    wire [WIDTH-1:0] q_anel, q_johnson;

    // Modelo de referência: um contador binário de "passos" desde o reset.
    // O estado esperado de cada contador é calculado a partir dele
    integer passos;
    reg  [WIDTH-1:0] esp_anel, esp_johnson;

    integer i, k;
    integer ciclos = 0;
    integer erros  = 0;

    // Dois DUTs: o mesmo módulo com parâmetros diferentes
    contador_anel #(.WIDTH(WIDTH), .JOHNSON(0)) dut_anel (
        .clk   (clk),
        .rst_n (rst_n),
        .en    (en),
        .q     (q_anel)
    );

    contador_anel #(.WIDTH(WIDTH), .JOHNSON(1)) dut_johnson (
        .clk   (clk),
        .rst_n (rst_n),
        .en    (en),
        .q     (q_johnson)
    );

    // Gerador de clock: período de 10 ns
    always #5 clk = ~clk;

    always @(posedge clk or negedge rst_n) begin
        if (!rst_n)
            passos <= 0;
        else if (en)
            passos <= passos + 1;
    end

    // Estados esperados a partir do número de passos:
    // anel   : o 1 está na posição (passos mod WIDTH)
    // Johnson: nos primeiros WIDTH passos, entram 1s pela direita;
    //          nos WIDTH seguintes, entram 0s
    always @(*) begin
        esp_anel = 1 << (passos % WIDTH);
        k = passos % (2 * WIDTH);
        if (k <= WIDTH)
            esp_johnson = (1 << k) - 1;                         // 0001, 0011, ...
        else
            esp_johnson = ~((1 << (k - WIDTH)) - 1);            // 1110, 1100, ...
    end

    // Verificação na borda de descida
    always @(negedge clk) begin
        ciclos = ciclos + 1;
        if (q_anel !== esp_anel || q_johnson !== esp_johnson) begin
            $display("ERRO: t=%0t anel=%b (esp %b) johnson=%b (esp %b)",
                     $time, q_anel, esp_anel, q_johnson, esp_johnson);
            erros = erros + 1;
        end
    end

    task mostra;
        $display(" %t |   %b    %b  |  %b  |  %b", $time, rst_n, en, q_anel, q_johnson);
    endtask

    initial begin
        // Arquivo de formas de onda para o GTKWave
        $dumpfile("tb_contador_anel.vcd");
        $dumpvars(0, tb_contador_anel);

        // Exibe o tempo em ns
        $timeformat(-9, 0, " ns", 6);

        $display("WIDTH = %0d", WIDTH);
        $display("------------------------------------------");
        $display(" tempo  | rst_n en  | anel  | johnson");
        $display("------------------------------------------");

        // Parte 1: testes dirigidos (aparecem nas formas de onda)
        rst_n = 1'b0; en = 1'b0;
        #12 rst_n = 1'b1;
        #1 mostra;                          // valores de reset
        en = 1'b1;
        for (i = 0; i < 2 * WIDTH + 1; i = i + 1) begin
            @(posedge clk); #1 mostra;      // uma volta completa do Johnson
        end
        en = 1'b0;                          // pausa
        repeat (2) begin
            @(posedge clk); #1 mostra;
        end
        en = 1'b1;
        repeat (2) begin
            @(posedge clk); #1 mostra;
        end

        // Parte 2: 1000 ciclos com en aleatório e resets ocasionais
        $dumpoff;
        for (i = 0; i < 1000; i = i + 1) begin
            @(posedge clk); #1 en = $random;
            if (($random & 63) == 0) begin  // reset em ~1 a cada 64 ciclos
                #2 rst_n = 1'b0;
                #2 rst_n = 1'b1;
            end
        end

        @(negedge clk);
        $display("------------------------------------------");
        if (erros == 0)
            $display("SUCESSO: %0d ciclos verificados!", ciclos);
        else
            $display("FALHA: %0d erro(s) em %0d ciclos.", erros, ciclos);

        $finish;
    end

endmodule
```

- **Modelo de referência independente**: em vez de reimplementar os deslocamentos, o testbench conta quantos **passos** foram dados desde o reset (`passos`) e calcula **diretamente** qual deveria ser o estado de cada contador: no anel, o `1` está na posição `passos mod WIDTH`; no Johnson, há `k` uns entrando (ou saindo) pela direita. É uma descrição diferente do mesmo comportamento, que é o que um bom modelo de referência deve ser.
- **`always @(*)` no testbench**: o bloco combinacional recalcula os estados esperados sempre que `passos` muda.
- **Resets aleatórios**: na parte aleatória, o reset é acionado de vez em quando, no meio do ciclo, para testar o retorno ao estado inicial em pontos arbitrários da sequência.

---

## Simulação

### Diagrama de tempo esperado

Os dois contadores com `en = 1`, e os 4 bits do Johnson separados. Repare que cada bit do Johnson é uma onda quadrada com **período de 8 ciclos**, e que cada uma está atrasada 1 ciclo em relação à anterior:

![Diagrama de tempo esperado](/assets/images/100dias/dia_018/dia_018_diagrama_tempo_esperado.png)

### Rodando no Icarus Verilog

```bash
# compila o projeto e o testbench
iverilog -g2012 -Wall -o tb_contador_anel.vvp rtl/contador_anel.v rtl/tb_contador_anel.v

# executa a simulação
vvp tb_contador_anel.vvp
```

A saída no terminal:

```text
VCD info: dumpfile tb_contador_anel.vcd opened for output.
WIDTH = 4
------------------------------------------
 tempo  | rst_n en  | anel  | johnson
------------------------------------------
  13 ns |   1    0  |  0001  |  0000
  16 ns |   1    1  |  0010  |  0001
  26 ns |   1    1  |  0100  |  0011
  36 ns |   1    1  |  1000  |  0111
  46 ns |   1    1  |  0001  |  1111
  56 ns |   1    1  |  0010  |  1110
  66 ns |   1    1  |  0100  |  1100
  76 ns |   1    1  |  1000  |  1000
  86 ns |   1    1  |  0001  |  0000
  96 ns |   1    1  |  0010  |  0001
 106 ns |   1    0  |  0010  |  0001
 116 ns |   1    0  |  0010  |  0001
 126 ns |   1    1  |  0100  |  0011
 136 ns |   1    1  |  1000  |  0111
------------------------------------------
SUCESSO: 1013 ciclos verificados!
```

Com 8 flip-flops (8 estados no anel, 16 no Johnson):

```bash
iverilog -g2012 -Wall -P tb_contador_anel.WIDTH=8 -o tb_contador_anel.vvp rtl/contador_anel.v rtl/tb_contador_anel.v
vvp tb_contador_anel.vvp
```

```text
WIDTH = 8
SUCESSO: 1021 ciclos verificados!
```

### Formas de onda no GTKWave

```bash
gtkwave tb_contador_anel.vcd
```

![Resultado da simulação no GTKWave](/assets/images/100dias/dia_018/dia_018_simulacao_gtkwave.png)

---

## Resumo

- Um **registrador de deslocamento** fechado em anel faz um único `1` girar: é o **contador em anel**, com `WIDTH` estados one-hot.
- Devolvendo o MSB **invertido**, temos o **contador Johnson**, com `2·WIDTH` estados e um único bit mudando por vez.
- Não há lógica entre os flip-flops, então os dois são muito rápidos; mas dependem do reset para começar num estado válido.
- Em Verilog: parâmetro que muda a função do módulo, deslocamento com concatenação em um bloco com clock, e dois DUTs no mesmo testbench.

No **Dia 019** voltamos aos circuitos combinacionais com o **decodificador**, que transforma um número binário justamente em um código one-hot. Até amanhã!
