<template>
<div class="row">
    <h1>Jogar</h1>
    <div class="row justify-content-center">
        <div class="col-12 d-flex justify-content-center">
            <div class="d-flex flex-column align-items-center justify-content-center mb-4">
                <div class="text-center">
                    <img src="https://picsum.photos/200/300?random=1" style="border-radius: 100%;width:55px;height: 55px;">
                </div>
                <span>Jogador 4</span>
            </div>
        </div>
        <div class="row m-0">
            <div class="col-1 col-lg-1 col-md-1 col-sm-1 col-xs-1 d-flex align-items-center">
                <div class="d-flex flex-column align-items-center justify-content-center mb-4">
                    <div class="text-center">
                        <img src="https://picsum.photos/200/300?random=2" style="border-radius: 100%;width:55px;height: 55px;">
                    </div>
                    <span>Jogador 4</span>
                </div>
            </div>
            <div class="col-10 col-lg-10 col-md-10 col-sm-10 col-xs-10">
                <div class="card p-3 bg-dark" style="height: 60vh;border-color: var(--color-border) !important">
                    <div>
                        <button class="btn btn-danger" @click.prevent="jogar()">Jogar</button>
                    </div>
                </div>
            </div>
            <div class="col-1 col-lg-1 col-md-1 col-sm-1 col-xs-1 d-flex align-items-center">
                <div class="d-flex flex-column align-items-center justify-content-center mb-4">
                    <div class="text-center">
                        <img src="https://picsum.photos/200/300?random=3" style="border-radius: 100%;width:55px;height: 55px;">
                    </div>
                    <span>Jogador 4</span>
                </div>
            </div>
        </div>
        <div class="col-12 d-flex justify-content-center mt-4">
            <div class="d-flex flex-column align-items-center justify-content-center">
                <div class="text-center">
                    <img src="https://picsum.photos/200/300?random=4" style="border-radius: 100%;width:55px;height: 55px;">
                </div>
                <span>Jogador 1  (você)</span>
            </div>
        </div>
    </div>
</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import req from '../helpers/http'
import { Manager, Socket} from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL

const App = defineComponent({
    data() {
        return {
            user: {
                id: null,
                nickname: null
            },
            error: null,
            manager: null as Manager | null,
            gameSocket: null as Socket | null,
            chatSocket: null as Socket | null
        }
    },

    created() {
        this.getUserData()
        this.connectSocketGame()
    },

    methods: {
        jogar(){
            this.gameSocket?.emit('game:play', {peca: [3,1]});

            this.gameSocket?.on('playResponse', (response) => {
                console.log('Received playResponse from server:', response);
            });
        },

        getUserData(){
            //TODO: componentizar
            let data = localStorage.getItem('dmno_user')
            if(data){
                try {
                    this.user = JSON.parse(data);
                } catch (error) {
                    this.$router.replace("/login")
                }
            }
        },

        connectSocketGame(){
            this.manager = new Manager(SERVER_URL, {
                autoConnect: false,
                query: { userID: this.user?.id }
            })

            this.gameSocket = this.manager.socket('/play');
            
            this.gameSocket.on('connect', () => {
                console.log('Socket connected:', this.gameSocket?.id);
            });

            this.gameSocket.on('error', (reason) => {
                console.log('Socket error:', reason);
            });

            this.gameSocket.on('game:full', (response) => {
                this.$router.replace('/partida-andamento')
            });

            //TODO: passar o evento de desconexão para a função de desconexão
            // Adicione um listener para o evento de desconexão
            this.gameSocket.on('disconnect', () => {
                console.log('Socket disconnected');
            });

            this.gameSocket.connect();
        }
    }
})

export default App
</script>