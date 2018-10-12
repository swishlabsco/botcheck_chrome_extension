Vue.component('dialog-whitelist', {
  template: `
    <el-dialog :visible.sync="dialogVisible" class="botcheck-dialog whitelist" :show-close="false">
      <el-main>
        <el-container>
          <el-row>
            <el-col :span="24">
              <span class="header">Whitelisted Accounts</span>
            </el-col>
          </el-row>
        </el-container>
        <hr/>
        <el-container>
          <el-row>
            <el-col :span="24">
              <div v-for="user in users" class="item">
                <div class="name">
                  <span class="realName">{{user.realname}}</span>
                  <span class="screenName">@{{user.username}}</span>
                </div>
                <span class="delete" @click="remove(user.username)"><i class="Icon Icon--close"></i></span>
              </div>
            </el-col>
          </el-row>
        </el-container>
      </el-main>
    </el-dialog>
  `,
  computed: {
    dialogVisible: {
      get() {
        return this.$store.state.dialogs.whitelist.visible;
      },
      set() {
        this.$store.commit('WHITELIST_CLOSE');
      }
    },
    users() {
      return this.$store.state.whitelist;
    }
  },
  methods: {
    remove(screenName) {
      this.$store.dispatch('REMOVE_FROM_WHITELIST', screenName);
    }
  }
});
