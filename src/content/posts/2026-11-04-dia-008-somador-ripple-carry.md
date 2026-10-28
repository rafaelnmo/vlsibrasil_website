---
title: "Dia 008 - Somador Ripple-Carry"
description: "Dia 008 do 100 Dias de RTL: o somador ripple-carry montado com somadores completos em cadeia usando generate, com análise do caminho crítico, testbench e simulação no Icarus Verilog e GTKWave."
date: 2026-11-04
author: rafael
categories: ["100 Dias de RTL", "Verilog"]
tags: ["RTL", "Verilog", "Aritmética", "Somador", "Ripple-Carry", "generate", "Icarus Verilog", "GTKWave"]
cover: "/assets/images/100dias/dia_008/dia_008_capa.png"
draft: true
---
Ontem descrevemos o CPA com uma linha de Verilog e deixamos a síntese decidir como construí-lo. Hoje construímos nós mesmos a versão mais simples: o **somador ripple-carry** (*Ripple-Carry Adder*, ou **RCA**), uma fila de somadores completos em que o vai-um "escorre" (*ripple*) de um para o outro. De quebra, aprendemos o **`generate`**, que cria quantas cópias de um módulo forem necessárias a partir de um único laço.

---

## Descrição

O RCA é a tradução direta da soma feita à mão: um **somador completo por coluna**, com o `cout` de cada um ligado ao `cin` do próximo. Para somar números de N bits, usamos N somadores completos do Dia 006.

Ele é pequeno e regular, mas tem um preço: cada somador completo só termina quando recebe o vai-um do anterior. No pior caso, o vai-um atravessa a fila inteira, e o atraso total cresce **linearmente** com o número de bits:

```text
t_ripple = N · t_FA
```

onde `t_FA` é o atraso do vai-um em um somador completo. Somar 64 bits demora 16 vezes mais que somar 4.

## Diagrama de Blocos

![Diagrama de blocos do somador ripple-carry](/assets/images/100dias/dia_008/dia_008_diagrama_blocos.png)

| Sinal  | Direção | Largura | Descrição                          |
|--------|---------|---------|------------------------------------|
| `in_a` | entrada | WIDTH   | Operando A                         |
| `in_b` | entrada | WIDTH   | Operando B                         |
| `cin`  | entrada | 1 bit   | Vai-um de entrada (*carry in*)     |
| `sum`  | saída   | WIDTH   | Soma                               |
| `cout` | saída   | 1 bit   | Vai-um de saída (*carry out*)      |

As portas são exatamente as mesmas do `somador_cpa` do Dia 007. Do lado de fora, os dois somadores são **intercambiáveis**; só a implementação muda.

## Tabela Verdade

Cada somador completo segue a tabela verdade do Dia 006. Para ver a cadeia funcionando, vamos acompanhar a soma `1011 + 0110` (11 + 6) **coluna por coluna**, com `cin = 0`:

![A soma 1011 + 0110, coluna por coluna](/assets/images/100dias/dia_008/dia_008_tabela_verdade.png)

Repare como o `c[i+1]` de cada linha vira o `c[i]` da linha de baixo: a coluna 1 gera vai-um (`1 + 1`), e as colunas 2 e 3 apenas o propagam até a saída. O resultado é `cout = 1` e `sum = 0001`, ou seja, `1 0001` = 17.

## Expressões Booleanas

![Expressões do somador ripple-carry](/assets/images/100dias/dia_008/dia_008_expressao_booleana.png)

As duas primeiras são as equações do somador completo, aplicadas a cada bit `i`, com `c[0] = cin` e `c[N] = cout`. A terceira resume o custo da cadeia: N somadores completos em série.

## Diagrama de Circuito

O RCA de 4 bits, com os nomes que as instâncias recebem dentro do `generate` (veremos isso no código):

![Somador ripple-carry de 4 bits](/assets/images/100dias/dia_008/dia_008_diagrama_circuito.png)

Em azul está o **caminho crítico**: o caminho mais lento do circuito, que define a frequência máxima em que ele pode operar. Ele começa em `cin` (ou nos bits menos significativos), atravessa os quatro somadores pela cadeia de vai-um e termina em `cout` e `sum[3]`.

### A propagação no tempo

Para ver o vai-um "escorrendo", imagine `in_a = 1111` e `in_b` mudando de `0000` para `0001`, com cada somador completo levando `t_FA` para responder:

![Propagação do vai-um no ripple-carry](/assets/images/100dias/dia_008/dia_008_propagacao.png)

Os vai-uns sobem **um de cada vez**, e a soma passa por valores intermediários errados (`1110`, `1100`, `1000`) antes de chegar ao resultado certo, `0000` com `cout = 1`, depois de `4 · t_FA`. Esses valores temporários são normais em lógica combinacional; num sistema síncrono, o registrador da saída só captura o resultado depois que ele estabiliza, e por isso o atraso do caminho crítico limita o clock.

Medindo com o Yosys (síntese genérica em portas de 2 entradas), a profundidade do RCA cresce exatamente como o esperado: 2 níveis de lógica por bit, mais 1:

| Largura (N) | Portas | Níveis de lógica no caminho crítico |
|-------------|--------|-------------------------------------|
| 8           | 64     | 17                                  |
| 16          | 128    | 33                                  |
| 32          | 256    | 65                                  |
| 64          | 512    | 129                                 |

---

## Código Verilog

O RCA é descrito de forma **estrutural**, reaproveitando o `somador_completo` do Dia 006 (que por sua vez usa o `meio_somador` do Dia 005). Os dois arquivos foram copiados para a pasta `rtl/` deste dia.

```verilog
// ============================================================================
// VLSI Brasil - 100 Dias de RTL
// Dia 008 - Somador Ripple-Carry (Ripple-Carry Adder - RCA)
// ----------------------------------------------------------------------------
// Descrição : Soma dois números de WIDTH bits e o vai-um de entrada cin.
//             Implementação estrutural: WIDTH somadores completos em cadeia,
//             o cout de cada um ligado ao cin do próximo.
//             {cout, sum} = in_a + in_b + cin
// ============================================================================

`timescale 1ns / 1ps

module somador_rca #(
    parameter WIDTH = 4                 // largura dos operandos
) (
    input  wire [WIDTH-1:0] in_a,       // operando A
    input  wire [WIDTH-1:0] in_b,       // operando B
    input  wire             cin,        // vai-um de entrada (carry in)
    output wire [WIDTH-1:0] sum,        // soma
    output wire             cout        // vai-um de saída (carry out)
);

    // Cadeia de vai-uns: carry[i] entra no bit i, carry[i+1] sai dele
    wire [WIDTH:0] carry;

    assign carry[0] = cin;

    // Um somador completo por bit
    genvar i;
    generate
        for (i = 0; i < WIDTH; i = i + 1) begin : g_bit
            somador_completo sc (
                .in_a (in_a[i]),
                .in_b (in_b[i]),
                .cin  (carry[i]),
                .sum  (sum[i]),
                .cout (carry[i+1])
            );
        end
    endgenerate

    assign cout = carry[WIDTH];

endmodule
```

O que há de novo aqui:

- **`generate` / `for`**: o laço não é executado durante a simulação. Ele é expandido **antes**, na elaboração do circuito, e cria `WIDTH` cópias do somador completo. Com `WIDTH = 32`, o mesmo código cria 32 somadores, sem mudar uma linha.
- **`genvar i`**: a variável de um laço `generate` precisa ser declarada como `genvar`. Ela só existe durante a elaboração e não vira hardware.
- **Bloco nomeado (`begin : g_bit`)**: cada iteração cria um escopo com nome, e as instâncias ficam em `g_bit[0].sc`, `g_bit[1].sc`, ... É assim que elas aparecem no GTKWave e nos relatórios de síntese. Sem o nome, o simulador inventa um (como `genblk1`), bem menos legível.
- **Vetor de vai-uns com um bit a mais**: `carry` tem `WIDTH+1` bits. `carry[0]` recebe `cin`, cada somador lê `carry[i]` e escreve `carry[i+1]`, e `carry[WIDTH]` vira o `cout`. O índice deixa a ligação entre os estágios explícita.

## Testbench

O testbench é o mesmo do Dia 007, trocando apenas o nome do módulo testado. Esse é um dos ganhos de manter as **mesmas portas**: a verificação de uma especificação ("somar dois números") serve para todas as implementações.

```verilog
// ============================================================================
// VLSI Brasil - 100 Dias de RTL
// Dia 008 - Testbench do Somador RCA
// ============================================================================

`timescale 1ns / 1ps

module tb_somador_rca;

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
    somador_rca #(.WIDTH(WIDTH)) dut (
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
        $dumpfile("tb_somador_rca.vcd");
        $dumpvars(0, tb_somador_rca);

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

---

## Simulação

### Diagrama de tempo esperado

Os mesmos 7 testes dirigidos do Dia 007, em decimal:

![Diagrama de tempo esperado](/assets/images/100dias/dia_008/dia_008_diagrama_tempo_esperado.png)

### Rodando no Icarus Verilog

Agora o projeto tem **três módulos de RTL**, e todos precisam ser passados ao compilador:

```bash
# compila o projeto (três módulos) e o testbench
iverilog -g2012 -Wall -o tb_somador_rca.vvp rtl/meio_somador.v rtl/somador_completo.v rtl/somador_rca.v rtl/tb_somador_rca.v

# executa a simulação
vvp tb_somador_rca.vvp
```

A saída no terminal:

```text
VCD info: dumpfile tb_somador_rca.vcd opened for output.
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

E com 32 bits, criando 32 somadores completos com o mesmo código:

```bash
iverilog -g2012 -Wall -P tb_somador_rca.WIDTH=32 -o tb_somador_rca.vvp rtl/meio_somador.v rtl/somador_completo.v rtl/somador_rca.v rtl/tb_somador_rca.v
vvp tb_somador_rca.vvp
```

```text
WIDTH = 32
SUCESSO: 1007 testes passaram!
```

### Formas de onda no GTKWave

```bash
gtkwave tb_somador_rca.vcd
```

![Resultado da simulação no GTKWave](/assets/images/100dias/dia_008/dia_008_simulacao_gtkwave.png)

Além das portas, adicionamos o vetor interno `dut.carry` (em binário). Entre 20 e 30 ns (`15 + 1`), ele vale `11110`: todos os vai-uns internos e o `cout` estão em `1`, o pior caso da cadeia. Como o nosso modelo não tem atrasos, a simulação mostra só o resultado final; os valores intermediários do diagrama de propagação aparecem apenas no circuito real (ou numa simulação com atrasos).

> **Dica:** no painel **SST** do GTKWave, abra `tb_somador_rca` → `dut` → `g_bit[0]` → `sc` para navegar pelas instâncias criadas pelo `generate`.

---

## Resumo

- O **somador ripple-carry** encadeia N somadores completos: o `cout` de cada bit vai para o `cin` do próximo.
- É pequeno e regular, mas o atraso cresce linearmente: `t_ripple = N · t_FA`.
- O **caminho crítico** passa por toda a cadeia de vai-um, de `cin` até `cout`/`sum[N-1]`.
- Em Verilog: `generate`, `genvar` e blocos nomeados criam N instâncias a partir de um laço, e um vetor `carry[WIDTH:0]` liga os estágios.
- O mesmo testbench do Dia 007 verifica a nova implementação, com qualquer largura.

No **Dia 009** vamos atacar o atraso do RCA: o **somador carry-lookahead** calcula os vai-uns "olhando adiante", usando os sinais de geração e propagação para não esperar pela cadeia. Até amanhã!
