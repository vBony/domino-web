<template>
    <div class="row">
        <div class="col-12">
            <h1 class="text-center">Cadastre-se</h1>
            <div class="row justify-content-center">
                <div class="col-12 col-lg-6 col-md-10 col-sm-12 col-xs-12">
                    <div class="card p-3 bg-dark" style="border-color: var(--color-border) !important">
                        <form @submit.prevent="signup()">
                            <div class="mb-3">
                                <label for="username" class="form-label text-light">Nome de usuário</label>
                                <input 
                                    type="text" 
                                    class="form-control focus-ring focus-ring-secondary bg-transparent text-light" 
                                    id="username" 
                                    aria-describedby="username"
                                    name="username"
                                    v-model="user.nickname"
                                    :class="error.nickname != null ? 'is-invalid' : ''"
                                    @input="toSnakeCase()"
                                >
                                <div v-if="error.nickname" id="usernameValidation" class="invalid-feedback">{{ error.nickname }}</div>
                            </div>
                            <div class="mb-3">
                                <label for="exampleInputPassword1" class="form-label text-light color">Senha</label>
                                <input 
                                    type="password" 
                                    class="form-control focus-ring focus-ring-secondary bg-transparent text-light"
                                    :class="error.password != null ? 'is-invalid' : ''"  
                                    id="exampleInputPassword1"
                                    v-model="user.password"
                                >
                                <div v-if="error.password" id="passwordValidation" class="invalid-feedback">{{ error.password }}</div>
                            </div>
                            <button type="submit" class="btn btn-primary">Entrar</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
    </template>
    
    <script lang="ts">
    import { defineComponent } from 'vue';
    import req from '../helpers/http'
    
    const SERVER_URL = import.meta.env.VITE_SERVER_URL
    
    const App = defineComponent({
        data() {
            return {
                user: {
                    nickname: "",
                    password: null
                },
                error: {
                    nickname: null,
                    password: null
                }
            }
        },
    
        methods: {
            signup(){
                req.post(SERVER_URL+'/user', this.user)
                .then((response) => {
                    alert("Usuário cadastrado com sucesso")
                    this.$router.push("/login")
                })
                .catch((reason) => {
                    this.limparErros()
                    if(reason.response.data.errors){
                        this.error = reason.response.data.errors
                    }
                })
            },

            toSnakeCase(){
                this.limparErros()

                const original = this.user.nickname;
                const snakeCase = original
                    .replace(/[^a-zA-Z0-9]+/g, ' ')
                    .replace(/\s+/g, '_')
                    .toLowerCase();

                this.user.nickname = snakeCase;
            },

            limparErros(){
                this.error = {
                    nickname: null,
                    password: null
                }
            }
        }
    })
    
    export default App
    </script>