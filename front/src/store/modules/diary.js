import router from "../../router";

const HOST = process.env.VUE_APP_SERVER_HOST;
// const ALBUMBUCKETNAME = process.env.VUE_APP_BUCKET_NAME
// const BUCKETREGION = process.env.VUE_APP_BUCKET_REGION
// const IDENTIFYPOOL = process.env.VUE_APP_IDENTIFYPOOL

const axios = require("axios");
import AWS from "aws-sdk";

const state = {
  chanList: null,
  chanId: null,
  postId: null,
  selectedChan: null,
  selectedDiary: null,
  s3: {},
  writerInfo: null,
  diaries: {
    dates: null
  },
  editDiary: null,
  editChan: null
};

const getters = {
  getChanList: state => state.chanList,
  getChanId: state => state.chanId,
  getSelectedChan: state => state.selectedChan,
  getSelectedDiary: state => state.selectedDiary,
  getS3: state => state.s3,
  getWriterInfo: state => state.writerInfo,
  getDiaries: state => state.diaries,
  getEditDiary: state => state.editDiary,
  getEditChan: state => state.editChan
};

const mutations = {
  setChanList: (state, chanList) => (state.chanList = chanList),
  setChanId: (state, chanId) => {
    state.chanId = chanId;
    sessionStorage.setItem("chan", chanId);
  },
  setPostId: (state, postId) => {
    state.postId = postId;
    sessionStorage.setItem("post", postId);
  },
  setSelectedChan: (state, channel) => (state.selectedChan = channel),
  setSelectedDiary: (state, diary) => (state.selectedDiary = diary),
  sets3: (state, s3) => {
    state.s3 = s3;
  },
  setWriterInfo: (state, writerInfo) => (state.writerInfo = writerInfo),
  setDiaries: (state, diaries) => (state.diaries = diaries),
  setEditDiary: (state, editDiary) => (state.editDiary = editDiary),
  setEditChan: (state, editChan) => (state.editChan = editChan)
};

const actions = {
  async bringChanList({
    commit
  }) {
    const token = sessionStorage.getItem("jwt");
    const options = {
      headers: {
        Authorization: "JWT " + token
      }
    };
    await axios.get(HOST + "/channels/", options).then(message => {
      commit("setChanList", message.data.channels);
    });
  },
  async addChannel({
    dispatch,
    commit
  }, PostInfo) {
    console.log("addChannel", PostInfo);
    await dispatch("s3Init", "channel");
    await dispatch("updates3", PostInfo);
    const token = sessionStorage.getItem("jwt");
    const options = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "JWT " + token
      }
    };
    const body = {
      title: PostInfo.title,
      cover_image: PostInfo.fileName,
      description: PostInfo.description
    };
    console.log("body", body);
    const res = await axios.post(HOST + "/channels/", body, options);
    console.log(res);
    await commit("setChanList", null);
    router.push("/");
  },
  bringChanDetail: ({
    commit
  }, channelId) => {
    const token = sessionStorage.getItem("jwt");
    const options = {
      headers: {
        Authorization: "JWT " + token
      }
    };
    axios.get(`${HOST}/channels/${channelId}`, options).then(message => {
      commit("setSelectedChan", message.data);
      // console.log(message);
      // router.push("postList");
      const temp = {};
      for (const post of message.data.post_set) {
        if (temp[post.created_at.slice(0, 10)]) {
          temp[post.created_at.slice(0, 10)].push({
            pk: post.pk,
            title: post.title,
            tags: post.tags,
            user_id: post.user_id
          });
        } else {
          temp[post.created_at.slice(0, 10)] = [{
            pk: post.pk,
            title: post.title,
            tags: post.tags,
            user_id: post.user_id
          }];
        }
      }
      const dates = Object.keys(temp).sort(function (a, b) {
        return b - a;
      });
      temp["dates"] = dates;
      commit("setDiaries", temp);
      // console.log(temp)
    });
  },
  async deleteChan({
    dispatch
  }, channelId) {
    const token = sessionStorage.getItem("jwt");
    const options = {
      headers: {
        Authorization: "JWT " + token
      }
    };
    await axios
      .delete(`${HOST}/channels/${channelId}`, options)
      .then(message => {
        message;
        alert("성공적으로 삭제되었습니다.");
      })
      .catch(message => {
        message;
        alert("삭제 중에 문제가 발생하였습니다.");
      });
    await dispatch("bringChanList");
    router.push("/");
  },
  async editChannel({
    dispatch,
    commit
  }, PostInfo) {
    console.log(PostInfo);
    dispatch;
    commit;
    if (PostInfo.file) {
      console.log("파일 변경");
      await dispatch("s3Init", "channel");
      await dispatch("updates3", PostInfo);
    } else {
      console.log("파일 변경 안함");
    }
    const token = sessionStorage.getItem("jwt");
    const options = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "JWT " + token
      }
    };
    const body = {
      title: PostInfo.title,
      cover_image: PostInfo.fileName,
      description: PostInfo.description
    };
    console.log("body", body);
    const res = await axios.put(
      `${HOST}/channels/${PostInfo.channelId}/`,
      body,
      options
    );
    console.log(res);
    await commit("setChanList", null);
    router.push("/");
  },
  bringDiaryDetail: ({
    commit,
    getters
  }, diaryPK) => {
    const token = sessionStorage.getItem("jwt");
    const options = {
      headers: {
        Authorization: "JWT " + token
      }
    };
    axios.get(`${HOST}/posts/${diaryPK}`, options).then(message => {
      commit("setSelectedDiary", message.data);
      const selectedChanUser = getters.getSelectedChan.user_set;
      for (let idx = 0; idx < selectedChanUser.length; idx++) {
        if (selectedChanUser[idx].id === message.data.user_id) {
          commit("setWriterInfo", selectedChanUser[idx]);
        }
      }
      router.push("/diaryDetail");
    });
  },
  async addComment({
    commit,
    getters
  }, reviewContext) {
    const token = sessionStorage.getItem("jwt");
    const postpk = getters.getSelectedDiary.pk;
    const options = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "JWT " + token
      }
    };
    const body = {
      context: reviewContext
    };
    await axios.post(`${HOST}/posts/${postpk}/comments/`, body, options).then(
      axios.get(`${HOST}/posts/${postpk}`, options).then(message => {
        commit("setSelectedDiary", message.data);
        const selectedChanUser = getters.getSelectedChan.user_set;
        for (let idx = 0; idx < selectedChanUser.length; idx++) {
          if (selectedChanUser[idx].id === message.data.user_id) {
            commit("setWriterInfo", selectedChanUser[idx]);
          }
        }
      })
    );
  },
  deleteComment({
    getters,
    commit
  }, commentInfo) {
    const token = sessionStorage.getItem("jwt");
    const postpk = getters.getSelectedDiary.pk;
    const options = {
      headers: {
        Authorization: "JWT " + token
      }
    };
    console.log(postpk, commentInfo.id);
    axios
      .delete(`${HOST}/posts/${postpk}/comments/${commentInfo.id}`, options)
      .then(message => {
        message;
        console.log(message);
        alert("성공적으로 삭제되었습니다.");
        axios.get(`${HOST}/posts/${postpk}`, options).then(message => {
          commit("setSelectedDiary", message.data);
          const selectedChanUser = getters.getSelectedChan.user_set;
          for (let idx = 0; idx < selectedChanUser.length; idx++) {
            if (selectedChanUser[idx].id === message.data.user_id) {
              commit("setWriterInfo", selectedChanUser[idx]);
            }
          }
        });
      })
      .catch(err => {
        err;
        alert("삭제 중에 문제가 발생하였습니다.");
      });
  },

  async deleteDiary({
    getters
  }, postId) {
    getters;
    const token = sessionStorage.getItem("jwt");
    const options = {
      headers: {
        Authorization: "JWT " + token
      }
    };
    await axios
      .delete(`${HOST}/posts/${postId}`, options)
      .then(message => {
        message;
        console.log(message);
        alert("성공적으로 삭제되었습니다.");
      })
      .catch(err => {
        err;
        alert("삭제 중에 문제가 발생하였습니다.");
      });
    router.push("/postList");
  },
  async leaveChannel({
    getters
  }, ChannelId) {
    getters;
    const token = sessionStorage.getItem("jwt");
    const options = {
      headers: {
        Authorization: "JWT " + token
      }
    };
    await axios
      .delete(`${HOST}/channels/${ChannelId}/join/`, options)
      .then(message => {
        message;
        console.log(message);
        alert("일기장 탈퇴가 성공적으로 이뤄졌습니다.");
      })
      .catch(err => {
        err;
        alert("일기장 탈퇴 도중 문제가 발생하였습니다.");
      });
    router.push("/");
  },
  //S3 부분
  s3Init: ({
    commit
  }, type) => {
    AWS.config.update({
      region: process.env.VUE_APP_BUCKET_REGION,
      credentials: new AWS.CognitoIdentityCredentials({
        IdentityPoolId: process.env.VUE_APP_IDENTIFYPOOL
      })
    });
    const s3 = new AWS.S3({
      apiVersion: "2006-03-01",
      params: {
        Bucket: process.env.VUE_APP_BUCKET_NAME + "/" + type
      }
    });
    commit("sets3", s3);
  },
  async updates3({
    commit
  }, PostInfo) {
    console.log("upadates3", PostInfo);
    const s3 = state.s3;
    const params = {
      Key: PostInfo.fileName,
      Body: PostInfo.file,
      ACL: "public-read-write"
    };
    const res = await s3.upload(params).promise();
    console.log(res);
    commit("sets3", {});
  },

  // async addPost({ getters }, PostInfo) {
  async addPost({
    dispatch,
    getters
  }, PostInfo) {
    await dispatch("s3Init", "diary");
    await dispatch("updates3", PostInfo);
    const token = sessionStorage.getItem("jwt");
    // 태그 분리
    let tags = PostInfo.tags;
    if (tags == null) {
      tags = "[]"
    } else {
      if (tags.includes("#")) tags = tags.replace(/(\s*)/g, "").split("#").slice(1)
      else if (tags.includes(",")) tags = tags.replace(/(\s*)/g, "").split(",")
      else if (tags.includes(" ")) tags = tags.split(" ")

      if (typeof tags == "object") tags = JSON.stringify(tags)
      else tags = '["' + tags + '"]'
    }

    const body = {
      title: PostInfo.title,
      context: PostInfo.context,
      video_file: PostInfo.fileName,
      tags: tags,
      cover_image: PostInfo.cover_image,
      channel_id: parseInt(getters.getSelectedChan.id),
      is_use_comment: PostInfo.possible,
      is_save_video: PostInfo.saveVideo
    };
    console.log("bodybody", body);
    const options = {
      headers: {
        Authorization: "JWT " + token
      }
    };
    const res = await axios.post(HOST + "/posts/", body, options);
    console.log("res", res);
    router.push("/postList");
  },
  async editPost({
    dispatch
  }, PostInfo) {
    if (PostInfo.file) {
      console.log("file 변경 있음");
      await dispatch("s3Init", "diary");
      await dispatch("updates3", PostInfo);
    } else {
      console.log("file 변경 없음");
    }
    const token = sessionStorage.getItem("jwt");
    // 태그 분리
    let tags = PostInfo.tags;
    if (tags == null) {
      tags = "[]"
    } else {
      if (tags.includes("#")) tags = tags.replace(/(\s*)/g, "").split("#").slice(1)
      else if (tags.includes(",")) tags = tags.replace(/(\s*)/g, "").split(",")
      else if (tags.includes(" ")) tags = tags.split(" ")

      if (typeof tags == "object") tags = JSON.stringify(tags)
      else tags = '["' + tags + '"]'
    }
    const body = {
      title: PostInfo.title,
      context: PostInfo.context,
      video_file: PostInfo.fileName,
      tags: tags,
      cover_image: PostInfo.cover_image,
      is_use_comment: PostInfo.possible,
      is_save_video: PostInfo.saveVideo
    };
    console.log("bodybody", body);
    const options = {
      headers: {
        Authorization: "JWT " + token
      }
    };
    const res = await axios.put(
      `${HOST}/posts/${PostInfo.post_id}/`,
      body,
      options
    );
    console.log("res", res);
    router.push("/postList");
  }
};

export default {
  state,
  getters,
  mutations,
  actions
};