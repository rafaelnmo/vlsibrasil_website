---
title:  "Arquivo Liberty"
description: 
author: rafael
date: 2024-01-01 11:33:00 +0800
categories: [ Arquivos, Liberty]
tags: [Frontend]
pin: true
math: true
mermaid: true
image: assets/images/001_post/cover/001_blog.png
---

O arquivo Liberty Timing (Lib) contém informações detalhadas sobre a temporização e o consumo de energia das células lógicas (std cells) de uma biblioteca de células para um determinado nó tecnológico. Essencialmente, o Liberty é um modelo de temporização que inclui dados como o atraso das células, o tempo de transição, os tempos de setup e hold, _leakage power_, entre outros.
Esse arquivo, geralmente com a extensão .lib, é um padrão desenvolvido pela Synopsys e distribuído como código aberto. Ele é amplamente utilizado no projetos de circuitos por descrever características das células, que são fundamentais para a análise de timing em várias etapas do fluxo de projetos.

## Tipos de arquivos Liberty 

Os parâmetros de temporização e consumo de potência de uma célula lógica são obtidos por meio de simulações elétricas realizadas em diferentes condições de operação — como variações de processo, temperatura e tensão. Os resultados dessas simulações são organizados e armazenados nos chamados arquivos Liberty (.lib), que são utilizados por ferramentas de EDA para análise de temporização (STA) e consumo. Existem três modelos principais utilizados para caracterizar células e gerar esses arquivos .lib:

- _**NLDM (Non-Linear Delay Model)**_
- _**CCS (Composite Current Source)**_
- _**ECSM (Effective Current Source Model)**_

### NLDM (Non-Linear Delay Model)

É o modelo mais tradicional e amplamente utilizado. Nele, a célula é modelada com base em tabelas que relacionam o atraso de propagação e a transição de saída com dois parâmetros principais:
- _**Transição na entrada (input net transition)**_
- _**Capacitância de carga na saída (Cload)**_

As simulações são feitas com fontes de tensão e os resultados são armazenados em tabelas 2D no arquivo .lib. O modelo NLDM é mais simples e leve, o que garante execução rápida das ferramentas de STA e arquivos menores. No entanto, ele apresenta limitações de precisão, especialmente em designs de alta performance, onde efeitos secundários têm maior impacto.

### CCS (Composite Current Source)
É um modelo mais avançado, desenvolvido pela Synopsys, no qual a célula é caracterizada usando uma fonte de corrente para modelar com maior fidelidade o comportamento elétrico, incluindo efeitos como queda de tensão (IR drop), acoplamento e variações de forma de onda.
O arquivo gerado, chamado CCS Lib, oferece maior precisão na análise de temporização e integridade de sinal, sendo ideal para tecnologias mais avançadas (por exemplo, abaixo de 28 nm). Por outro lado, o CCS requer mais parâmetros de entrada, tem maior tempo de simulação e gera arquivos .lib maiores.

### ECSM (Effective Current Source Model)
O ECSM é uma alternativa ao CCS, também baseado em uma fonte de corrente, mas com um modelo mais compacto e eficiente. Ele tenta equilibrar precisão e desempenho, oferecendo resultados comparáveis ao CCS, mas com menor complexidade computacional e arquivos menores.
O ECSM é amplamente adotado por ferramentas da Cadence e se destaca pela boa precisão na modelagem da forma de onda de saída e transições internas, sem penalizar tanto a performance da análise.
Cada modelo tem seus prós e contras, e a escolha entre NLDM, CCS e ECSM depende dos requisitos de precisão, tempo de execução e tecnologia do processo utilizados no projeto. A Figura 1 mostra uma comparação do tamanho de um arquivo CCS e um NLDM.

![Desktop View](/assets/images/001_post/lib_size.png){: width="972" height="589" .responsive-img-post-11}
_Figura 1. Tamanho arquivos Liberty CSS e NLDM_

## Contexto no VLSI

No fluxo de design de circuitos integrados, especialmente durante as etapas de síntese lógica e análise estática de temporização (STA), é essencial contar com informações precisas sobre os atrasos de propagação e o consumo das células (como portas lógicas e flip-flops) que compõem o circuito. Realizar simulações SPICE para todo o circuito seria extremamente complexo e demorado. Por isso, utiliza-se modelos de temporização simplificados, conhecidos como timing models, para estimar o atraso de forma mais eficiente.

Para cada cell arc — ou seja, para cada combinação de entrada e caminho específico entre uma entrada e uma saída de uma célula lógica, como mostrado na Figura 2 — deseja-se determinar dois parâmetros principais: o atraso de propagação (_propagation delay_, tpd) e a transição de saída (_output transition time_, trise/tfall). O _propagation delay_ representa o tempo que leva para uma mudança na entrada refletir na saída. Já a _output transition time_ indica quanto tempo a saída leva para estabilizar após essa mudança.

![Desktop View](/assets/images/001_post/cell_arc.png){: width="200" height="589" .responsive-img-post-11}
_Figura 2: Exemplos de diferentes cell arcs para uma standard cell_

Os modelos NLDM (Non-Linear Delay Models) são amplamente utilizados para essa finalidade. Eles consideram dois fatores principais como entrada: a transição de entrada (_input net transition_, trise/tfall) e a capacitância de carga na saída (_output load capacitance_, cload). Com base nesses dois parâmetros — que são tabulados no arquivo .lib — as ferramentas de EDA utilizadas para STA conseguem calcular tanto o atraso de propagação quanto a transição de saída, conforme ilustrado na figura abaixo.

![Desktop View](/assets/images/001_post/timing_calculation.png){: width="500" height="589" .responsive-img-post-11}
_Figura 3: Parâmetros utilizados e calculados usando NLDM_

Esses dados presentes no arquivo Liberty são fornecidos pela _foundry_, que os obtém por meio de simulações detalhadas durante o processo de caracterização elétrica das células padrão (_standard cells_). É importante destacar que cada arquivo _Liberty_ é gerado considerando diferentes condições de operação — como variações de processo, temperatura e tensão (chamadas de corners). Assim, os valores de atraso de propagação e transição de saída dependerão diretamente do corner utilizado durante a análise de temporização.

O liberty é construído por declarações (_statements_) que podem conter várias linhas. Todas as informações do liberty são descritas usando três tipos de declarações: 
- **Declarações de grupo (_Group Statements_)** 
- **Declarações de atributo (_Attribute Statements_)** 
- **Declarações define (_Define Statements_)** 


![Desktop View](/assets/images/001_post/lib_sintax.png){: width="972" height="589" .responsive-img-post-11}
_Figura 4: Declarações básicas do arquivo Liberty_

## Grupo (_Group Statements_)
Um grupo é uma coleção de declarações que pode descrever uma biblioteca, uma célula, um pino, um arco de temporização, e assim por diante. Chaves ({}), são usadas em pares, delimitando o conteúdo do grupo. Além disso um grupo pode conter vários atributos e ainda outros grupos como seus elementos.

_**&nbsp;&nbsp;&nbsp;&nbsp;group_name (name) {  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;... statements ...  
&nbsp;&nbsp;&nbsp;&nbsp;}**_

## Atributo (_Attribute Statements_)
Uma declaração de atributo determina uma característica específica de um objeto da biblioteca, como uma célula, um pino, etc. Os atributos são sempre colocados dentro de uma declaração de grupo. 
Os atributos ainda podem ser divididos, com base na sua sintaxe, em dois tipos: Atributos simples e atributos complexos.

- #### Atributo simples (_Simple Attributes_)
    Atributos simples possuem uma sintaxe básica, independente do valor. É necessário separar o nome do atributo do valor do atributo com um espaço, seguido por dois pontos e outro espaço. As declarações de atributo devem estar em uma única linha.
    
    _**&nbsp;&nbsp;&nbsp;&nbsp;attribute_name : attribute_value ;**_  


- #### Atributo complexo (_Complex Attributes_)
    Um atributo complexo inclui um ou mais parâmetros entre parênteses. A sintaxe da declaração de atributo complexo é: 

    _**&nbsp;&nbsp;&nbsp;&nbsp;attribute_name (parameter1, [parameter2, parameter3 ...] );**_  

## _Define_ (_Define Statements_)
Você pode ainda criar novos atributos simples personalizados com a declaração define.  

_**&nbsp;&nbsp;&nbsp;&nbsp;define (attribute_name, group_name, attribute_type) ;**_

Arquivos liberty grandes podem comprometer a capacidade do disco e os recursos de memória. Para reduzir o tamanho do arquivo Lib e melhorar o gerenciamento de arquivos, a sintaxe permite que você combine vários arquivos-fonte.  As referências são feitas no arquivo-fonte que contém a descrição do grupo da library. Durante a compilação da biblioteca, as informações referenciadas são recuperadas, incluídas no ponto de referência, e então a compilação continua. A sintaxe da declaração de include é: 

_**&nbsp;&nbsp;&nbsp;&nbsp;include_file (file_nameid) ;**_  

## Principais campos do Liberty 

### Grupo _library_ 
O grupo _library_ abrange toda a descrição da biblioteca de células contida em um arquivo Liberty. Todos os atributos e grupos são definidos dentro de uma _library_, além disso os atributos gerais que se aplicam a todas as células são estabelecidos nesse nível. Cada arquivo .lib deve conter apenas um grupo do tipo _library_, e sua declaração deve ser a primeira linha executável do arquivo.

    library (asap7sc7p5t_LVT_TT_nldm_211120) {
        comment : "";
        date : "$Date: Mon Dec  7 13:44:02 2020 $";
        revision : "1.0";
        delay_model : table_lookup;
        capacitive_load_unit (1,ff);
        current_unit : "1mA";
        leakage_power_unit : "1pW";
        pulling_resistance_unit : "1kohm";
        time_unit : "1ps";
        voltage_unit : "1V";
        default_fanout_load : 1;
        default_max_transition : 320;
        type ( name ) {
            ... 
        }
        lu_table_template(name) {
            ...
        }
        ...
        cell (INVx1_ASAP7_75t_L) {
            ...
        }
    }

### Templates

Os modelos de tabela (_table templates_) armazenam informações comuns que podem ser usadas por várias tabelas de consulta (_lookup tables_). Um modelo de tabela especifica os parâmetros da tabela e os pontos de interrupção para cada eixo. É necessário atribuir um nome a cada modelo para que as tabelas de consulta possam se referir a ele ao longo do liberty. O modelo de tabela que especifica os atrasos de temporização pode ter até três variáveis (variable_1, variable_2 e variable_3). As variáveis indicam os parâmetros usados para indexar a tabela de consulta ao longo do primeiro, segundo e terceiro eixos da tabela. Os parâmetros incluem o tempo de transição de entrada de um pino restrito, o comprimento da rede de saída e a capacitância, além da carga de saída de um pino relacionado.

    lu_table_template(name) {
        variable_1 : value;
        variable_2 : value;
        variable_3 : value;
        index_1 ("float, ..., float");
        index_2 ("float, ..., float");
        index_3 ("float, ..., float");
    }

Para representar a potência interna, é possível também criar modelos de informações comuns que podem ser usados por várias tabelas de consulta. Utilize o grupo _power_lut_template_ em nível de biblioteca para criar esses modelos. Uma _power_lut_template_ especifica os parâmetros da tabela e os pontos de interrupção para cada eixo. É necessário atribuir um nome a cada modelo para ser referenciado ao longo do liberty.

    power_lut_template(name) {
        variable_1 : string ;
        variable_2 : string ;
        variable_3 : string ;
        index_1("float, ... , float") ;
        index_2("float, ... , float") ;
        index_3("float, ... , float") ;
    }

### Grupo _cell_ 
As descrições de células são uma parte fundamental de uma biblioteca de tecnologia. Elas fornecem informações sobre a área, função e temporização de cada componente em uma tecnologia ASIC. O grupo _cell_ é responsável por conter os atributos e groupos que declaram essas informações.

    library (lib_name) {
        ...
        cell( name ) {
        ... cell description ...
        }
        ...
    }

### Grupo _pin_ 
Para cada pino em uma célula da biblioteca, um grupo _cell_ deve conter auma descrição das características de consumo e atraso do pino. As características do pino são definidas em um grupo _pin_ dentro do grupo _cell_. Um grupo _pin_ geralmente contém um grupo _timing_ e um grupo _internal_power_.

    library (lib_name) {
        ...
        cell (cell_name) {
            ...
            pin ( name | name_list ) {
            ... pin group description ...
            }
        }
        cell (cell_name) {
            ...
            bus (bus_name) {
            ... bus group description ...
            }
            bundle (bundle_name) {
            ... bundle group description ...
            }
            pin ( name | name_list ) {
            ... pin group description ...
            }
        }
    }

### Grupo _timing_ 

O grupo _timing_ contém informações para modelar arcos de temporização (timing arcs) e rastridentificar caminhos durante a STA. Ele define os arcos de temporização através de uma célula e as relações entre os sinais de clock e das entrada dados.

O grupo _timing_ descreve:

- Relações de temporização entre um pino de entrada e um pino de saída.
- Relações de temporização entre dois pinos de saída.
- Arcos de temporização através de um elemento não combinacional.
- Tempos de setup e hold em entradas de flip-flop ou latch.
- Opcionalmente, os nomes dos arcos de temporização.

O grupo _timing_ também descreve as informações de setup e hold quando as informações de restrição se referem a um par de pinos de entrada.

    library (lib_name) {
        cell (cell_name) {
            pin (pin_name) {
                timing () {
                ... timing description ...
                }
            }
        }
    }

Dentro do grupo _timing_, é possível identificar o nome ou os nomes de diferentes arcos de temporização. Um único arco pode ocorrer entre um pino identificado e um único pino relacionado, identificado com o atributo related_pin.
Múltiplos arcos de temporização podem ocorrer de várias maneiras. A lista a seguir mostra seis possíveis configurações de múltiplos arcos de temporização. As seções descritivas explicam como configurar outras possíveis variações:

- Entre um único pino relacionado e os múltiplos membros identificados de um bundle.
- Entre múltiplos pinos relacionados e os múltiplos membros identificados de um bundle.
- Entre um único pino relacionado e os múltiplos bits identificados de um barramento.
- Entre múltiplos pinos relacionados e os múltiplos bits identificados de um barramento.
- Entre os múltiplos bits identificados de um barramento e os múltiplos pinos de um barramento relacionado (com uma largura designada).
- Entre o pino interno e todos os bits do grupo de barramento de ponto final.  

```plaintext
    cell (cell_name) {
        ...
        pin (A) {
            direction : input;
            capacitance : 1;
        }
        pin (B) {
            direction : output
            function : "A’";
            timing (A_B) {
                related_pin : "A";
                ...
            }/* fim timing */
        }/* fim pino B */
        pin (C) {
            direction : output
            function : "A B";
            timing (A_C, B_C) {
                related_pin : "A B";
                ...
            }/* fim timing */
        }/* fim C */
    }/* fim cell */
```

Agora que já exploramos os principais elementos que compõem a estrutura de um arquivo Liberty, podemos representar sua organização de forma mais clara por meio de uma hierarquia, como mostrado na Figura 3. Essa representação visual ajuda a entender como as informações estão estruturadas dentro do arquivo .lib, facilitando a leitura e a navegação pelos diferentes blocos de dados, como células, pinos, arcos de temporização e parâmetros tecnológicos.


![Desktop View](/assets/images/001_post/hierarchy.png){: width="972" height="589" .responsive-img-post-11}
_Figura 5: Representação hierárquica do arquivo Liberty_

### Exemplo de cálculo de atraso usando Non-Linear Delay Model (NLDM)

Vamos supor que queremos calcular o atraso de propagação (tpd) de uma porta inversora (sg13g2_inv_1) em uma biblioteca caracterizada usando NLDM mostrada na Figura 5. Para isso, precisamos de dois parâmetros de entrada:
- Transição da entrada (input net transition): 0.174 ns
- Capacitância de carga na saída (Cload): 0.039 pF

Esses dois valores serão usados como índices para acessar uma tabela de atraso (delay table) no arquivo .lib. As tabelas geralmente são 2D, com uma dimensão para a transição de entrada e outra para a carga de saída.


![Desktop View](/assets/images/001_post/nldm_example.png){: width="972" height="589" .responsive-img-post-11}
_Figura 5: Exemplo cálculo de atraso usando NLDM_

Localizamos os índices na tabela:
- Input net transition = 0.174 ns → linha intermediária.
- Cload = 0.039 fF → coluna do meio.

O valor correspondente na tabela é **0.0156287 ns**, portando atraso de propagação (tpd) da porta para essa condição é 0.0156287 ns.

Quando os valores de entrada, como o input net transition e Cload, não correspondem exatamente aos pontos definidos nas tabelas do arquivo .lib, as ferramentas de EDA utilizam técnicas de interpolação. Esse processo permite estimar com certa precisão os valores intermediários de propagation delay com base nos dados tabelados mais próximos.


## Design Liberty 

Arquivos liberty podem ainda ser gerados para blocos ou IPs digitais ou analógicos já sintetizados com o objetivo de permitir análises mais precisas de STA em níveis superiores (top level) de projetos.  
As informações relevantes do liberty dependem das restrições que precisam ser respeitadas no bloco na integração de topo (top integration), para usar o mecanismo de STA e permitir otimizações.

    library (counter) {
        comment                        : "";
        delay_model                    : table_lookup;
        simulation                     : false;
        capacitive_load_unit (1,pF);
        leakage_power_unit             : 1pW;
        current_unit                   : "1A";
        pulling_resistance_unit        : "1kohm";
        time_unit                      : "1ns";
        voltage_unit                   : "1v";
        library_features(report_delay_calculation);

        nom_process                    : 1.0;
        nom_temperature                : 25.0;
        nom_voltage                    : 1.80;

        lu_table_template(template_1) {
            variable_1 : total_output_net_capacitance;
            index_1("0.00050,  0.00126,  0.00319,  0.00806,  0.02037,  0.05146,  0.13002");
        }
        type ("o_count") {
            base_type : array;
            data_type : bit;
            bit_width : 4;
            bit_from : 3;
            bit_to : 0;
        }

        cell ("counter") {
            area : 361.597 
            is_macro_cell : true;
            pin("clk") {
                direction : input;
                clock : true;
                capacitance : 0.0079;
                timing() {
                    timing_sense : positive_unate;
                    timing_type : min_clock_tree_path;
                    cell_rise(scalar) {
                        values("0.21483");
                    }
                    cell_fall(scalar) {
                        values("0.25144");
                    }
                }
                timing() {
                    timing_sense : positive_unate;
                    timing_type : max_clock_tree_path;
                    cell_rise(scalar) {
                        values("0.21645");
                    }
                    cell_fall(scalar) {
                        values("0.25292");
                    }
                }
            }
            pin("i_count_en") {
                direction : input;
                capacitance : 0.0036;
                timing() {
                    related_pin : "clk";
                    timing_type : hold_rising;
                    rise_constraint(scalar) {
                        values("-0.06257");
                    }
                    fall_constraint(scalar) {
                        values("-0.09538");
                    }
                }
                timing() {
                    related_pin : "clk";
                    timing_type : setup_rising;
                    rise_constraint(scalar) {
                        values("0.55838");
                    }
                    fall_constraint(scalar) {
                        values("0.49229");
                    }
                }
            }
            pin("VGND") {
            direction : input;
            capacitance : 0.0000;
            }
            pin("VPWR") {
            direction : input;
            capacitance : 0.0000;
            }
            bus("o_count") {
            bus_type : o_count;
            direction : output;
            capacitance : 0.0000;
            pin("o_count[3]") {
                direction : output;
                capacitance : 0.0000;
                timing() {
                related_pin : "clk";
                timing_type : rising_edge;
                cell_rise(template_1) {
                        index_1("0.00050,  0.00126,  0.00319,  0.00806,  0.02037,  0.05146,  0.13002");
                        values("0.66718,0.67403,0.69009,0.72908,0.82717,1.07278,1.68988");
                }
                ...
                }
            }
            pin("o_count[2]") {
                ...
            }
            pin("o_count[1]") {
                ...
            }
            pin("o_count[0]") {
                ...
            }
            }
        }

    }

Normalmente, um IP analógico que possui restrições de temporização é caracterizado (memórias, células padrão, blocos digitais personalizados), e um arquivo .lib é gerado (com um script Perl ou por ferramenta de EDA). Se não houver restrições de temporização a serem respeitadas, as informações mínimas no arquivo .lib são a seção de pinos, sem as seções de temporização/potência.

Geralmente, um IP analógico sem restrições é entregue como LEF/Lib, e o .lib contém:

- Pinos de saída (obrigatório, alinhado com o módulo Verilog)

- Valores máximos de capacitância/transição/etc. (regras de design) (não obrigatório, mas ajuda na colocação/roteamento ou síntese para corrigir e/ou antecipar o valor de capacitância).

Você pode criar um .lib copiando e colando de um arquivo existente, e substituindo as seções de células/pinos, etc.

![Desktop View](/assets/images/001_post/lib_sintax.png){: width="972" height="589" .responsive-img-post-11}
_Declarações básicas do arquivo Liberty_


#### Referencias

<a href="https://www.ispd.cc/contests/18/lefdefref.pdf" class="link-offset-2 link-offset-3-hover link-underline link-underline-opacity-0 link-underline-opacity-75-hover !important">https://www.ispd.cc/contests/18/lefdefref.pdf</a>. Acessado em 24-Jul-2023

<a href="http://coriolis.lip6.fr/doc/lefdef/lefdefref/LEFSyntax.html." class="link-offset-2 link-offset-3-hover link-underline link-underline-opacity-0 link-underline-opacity-75-hover !important">http://coriolis.lip6.fr/doc/lefdef/lefdefref/LEFSyntax.html.</a>. Acessado em 24-Jul-2023
