Vue.component('dialog-whitelist', {
  template: html`
    <el-dialog :visible.sync="dialogVisible" class="botcheck-dialog whitelist">
      <el-main>
        <el-container>
          <el-row>
            <el-col :span="24">
              <span class="header">Whitelisted Accounts</span>
              <hr/>
              <div v-for="name in items" class="item">
                <span class="screenName">@{{name}}</span>
                <span class="delete" @click="remove(name)"><i class="Icon Icon--close"></i></span>
              </div>
            </el-col>
          </el-row>
        </el-container>
      </el-main>
    </el-dialog>
  `(),
  computed: {
    dialogVisible: {
      get() {
        return this.$store.state.synced.dialogs.whitelist.visible;
      },
      set() {
        this.$store.broadcastMutation('WHITELIST_CLOSE');
      }
    },
    items() {
      return this.$store.state.synced.whitelist;
    }
  },
  methods: {
    remove(screenName) {
      this.$store.broadcastAction('REMOVE_FROM_WHITELIST', screenName);
    }
  }
});
