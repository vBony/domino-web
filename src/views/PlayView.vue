<!-- @ts-ignore -->
<template>
<div class="row">
    <h1>Jogar</h1>
    <div class="row justify-content-center">
        <div class="col-12 d-flex justify-content-center">
            <div class="d-flex flex-column align-items-bottom justify-content-center mb-4" v-if="players[2] !== undefined">
                <player-table 
                    :nickname="players[2].nickname"
                    :id="players[2].id"
                    :online="players[2].online"
                />
            </div>
        </div>
        <div class="row m-0">
            <div class="col-1 col-lg-1 col-md-1 col-sm-1 col-xs-1 d-flex align-items-center justify-content-end">
                <div class="d-flex flex-column align-items-center justify-content-center mb-4" v-if="players[3] !== undefined">
                    <player-table 
                        :nickname="players[3].nickname"
                        :id="players[3].id"
                        :online="players[3].online"
                    />
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
                <div class="d-flex flex-column align-items-center justify-content-center mb-4" v-if="players[4] !== undefined">
                    <player-table 
                        :nickname="players[4].nickname"
                        :id="players[4].id"
                        :online="players[4].online"
                    />
                </div>
            </div>
        </div>
        <div class="col-12 d-flex justify-content-center mt-4">
            <div class="d-flex flex-column align-items-center justify-content-center">
                <player-table 
                    :nickname="user.nickname + ' (você)'"
                    :id="user.id"
                />
            </div>
        </div>
    </div>
</div>
</template>

<script lang="ts">
// @ts-nocheck
import { defineComponent } from 'vue';
import req from '../helpers/http'
import { Manager, Socket} from 'socket.io-client';
import PlayerTable from '../components/PlayerTable.vue'

const SERVER_URL = import.meta.env.VITE_SERVER_URL


const App = defineComponent({
    components: {
        'player-table': PlayerTable 
    },

    data() {
        return {
            user: {
                id: null,
                nickname: null
            },

            players: {},

            error: null,
            manager: null as Manager | null,
            gameSocket: null as Socket | null,
            chatSocket: null as Socket | null
        }
    },

    created() {
        this.getUserData()
    },

    mounted() {
        this.socketGameInstance()
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

        socketGameInstance() {
            this.manager = new Manager(SERVER_URL, {
                autoConnect: false,
                query: { userID: this.user?.id }
            });

            this.gameSocket = this.manager.socket('/game');

            this.gameSocket?.on('connect', () => {
                console.log('Socket connected:', this.gameSocket?.id);
            });

            this.gameSocket?.on('error', (reason) => {
                console.log('Socket error:', reason);
            });

            this.gameSocket?.on('table_full', () => {
                this.$router.replace('/partida-andamento');
            });

            this.gameSocket?.on('player_joined', (response) => {
                this.refreshPlayers(response.players);
            });

            this.gameSocket?.on('player_left', (response) => {
                this.refreshPlayers(response.players, response.leftPlayer);
            });

            this.gameSocket?.on('disconnect', () => {
                console.log('Socket disconnected');
            });

            this.gameSocket.connect();
        },

        
        refreshPlayers(players){
            const firstPositionTable = 1
            for (const player of Object.values(players)) {
                if(player?.id == this.user.id){
                    this.players[1] = player
                }else{
                    this.players[firstPositionTable + 1] = player
                }
            }
        }
    }
})

export default App
</script>