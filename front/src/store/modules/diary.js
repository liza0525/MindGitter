import router from "../../router";

const HOST = process.env.VUE_APP_SERVER_HOST;

const axios = require("axios");
import AWS from "aws-sdk";

const state = {
  chanList: null,
  chanId: null,
  chanName: null,
  postId: null,
  selectedChan: null,
  selectedDiary: null,
  s3: {},
  writerInfo: null,
  diaries: {
    dates: null
  },
  editDiary: null,
  editChan: null,
  postLoading: false,
  series: null,
  charOptions: {
    chart: {
        height: 350,
        type: 'bubble',
        zoom: {
          type: 'x',
          enabled: true,
          autoScaleYaxis: true
        },
        toolbar: {
          autoSelected: 'zoom'
        }
    },
    dataLabels: {
        enabled: false
    },
    fill: {
        opacity: 0.5
    },
    title: {
        text: 'Emotion Chart'
    },
    xaxis: {
        tickAmount: 12,
        type: 'category',
    },
    yaxis: {
      min: 35
    },
    colors: ['#A93F55', '#46AF78', "#663F59",  '#BAFF29', "#4E88B4", "#F27036", '#7A918D'],
  },
  notiList: null
};

const getters = {
  getChanList: state => state.chanList,
  getChanId: state => state.chanId,
  getChanName: state => state.chanName,
  getSelectedChan: state => state.selectedChan,
  getSelectedDiary: state => state.selectedDiary,
  getS3: state => state.s3,
  getWriterInfo: state => state.writerInfo,
  getDiaries: state => state.diaries,
  getEditDiary: state => state.editDiary,
  getEditChan: state => state.editChan,
  getPostLoading: state => state.postLoading,
  getSeries: state => state.series,
  getChartOptions: state => state.charOptions,
  getNotiList: state => state.notiList
};

const mutations = {
  setChanList: (state, chanList) => (state.chanList = chanList),
  setChanId: (state, chanId) => {
    state.chanId = chanId;
    sessionStorage.setItem("chan", chanId);
  },
  setChanName: (state, chanName) => {
    state.chanName = chanName;
    sessionStorage.setItem("chanName", chanName);
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
  setEditChan: (state, editChan) => (state.editChan = editChan),
  setPostLoading: (state, flag) => (state.postLoading = flag),
  setSeries: (state, series) => (state.series = series),
  setNotiList: (state, notiList) => (state.notiList = notiList)
};

const actions = {
  async bringChanList({ commit }) {
    const token = sessionStorage.getItem("jwt");
    const options = {
      headers: {
        Authorization: "JWT " + token
      }
    };
    await axios.get(HOST + "/channels/", options).then(message => {
      commit("setChanList", message.data.channels);
      return "y"
    });
  },
  async addChannel({ dispatch, commit }, PostInfo) {
    if (PostInfo.title && PostInfo.description) {
      if (PostInfo.file) {
        await dispatch("s3Init", "channel");
        await dispatch("updates3", PostInfo);
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
      await axios.post(HOST + "/channels/", body, options);
      await commit("setChanList", null);
      router.push("/");
    } else if (PostInfo.title) {
      alert("! 일기장에 대한 설명을 작성해주세요.");
    } else if (PostInfo.description) {
      alert("! 일기장의 제목을 작성해주세요.");
    } else {
      alert(
        "! 일기장의 제목을 작성해주세요\n! 일기장에 대한 설명을 작성해주세요."
      );
    }
  },
  bringChanDetail: ({ commit }, channelId) => {
    const token = sessionStorage.getItem("jwt");
    const options = {
      headers: {
        Authorization: "JWT " + token
      }
    };
    axios.get(`${HOST}/channels/${channelId}`, options).then(message => {
      commit("setSelectedChan", message.data);
      commit("setChanName", message.data.title);
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
          temp[post.created_at.slice(0, 10)] = [
            {
              pk: post.pk,
              title: post.title,
              tags: post.tags,
              user_id: post.user_id
            }
          ];
        }
      }
      const dates = Object.keys(temp).sort(function(a, b) {
        return b - a;
      });
      temp["dates"] = dates;
      commit("setDiaries", temp);
    });
  },
  async deleteChan({ dispatch }, channelId) {
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
  async editChannel({ dispatch, commit }, PostInfo) {
    if (PostInfo.file) {
      await dispatch("s3Init", "channel");
      await dispatch("updates3", PostInfo);
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
    await axios.put(
      `${HOST}/channels/${PostInfo.channelId}/`,
      body,
      options
    );
    await commit("setChanList", null);
    router.push("/");
  },
  async bringDiaryDetail({ commit }, diaryPK) {
    const token = sessionStorage.getItem("jwt");
    const options = {
      headers: {
        Authorization: "JWT " + token
      }
    };
    const message = await axios.get(`${HOST}/posts/${diaryPK}/`, options);
    await commit("setSelectedDiary", message.data);
    const mess = await axios.get(
      `${HOST}/user/${message.data.user_id}/`,
      options
    );
    await commit("setWriterInfo", mess.data);
  },
  async addComment({ getters, commit }, reviewContext) {
    const token = sessionStorage.getItem("jwt");
    const postpk = getters.getSelectedDiary.pk;
    const chanId = sessionStorage.getItem("chan");
    const options = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "JWT " + token
      }
    };
    const body = {
      context: reviewContext
    };
    await axios.post(`${HOST}/posts/${postpk}/comments/`, body, options)
    const message = await axios.get(`${HOST}/channels/${chanId}`, options)
    await commit("setSelectedChan", message.data);
    const message2 = await axios.get(`${HOST}/posts/${postpk}/`, options);
    await commit("setSelectedDiary", message2.data);
    const selectedChanUser = getters.getSelectedChan.user_set;
    for (let idx = 0; idx < selectedChanUser.length; idx++) {
      if (selectedChanUser[idx].id === message.data.user_id) {
        commit("setWriterInfo", selectedChanUser[idx]);
      }
    }    
  },
  async deleteComment({ getters, commit }, commentInfo) {
    const token = sessionStorage.getItem("jwt");
    const postpk = getters.getSelectedDiary.pk;
    const chanId = sessionStorage.getItem("chan");
    const options = {
      headers: {
        Authorization: "JWT " + token
      }
    };
    try {
      const messa = await axios.delete(`${HOST}/posts/${postpk}/comments/${commentInfo.id}`, options)
      messa;
      alert("성공적으로 삭제되었습니다.");
      const message = await axios.get(`${HOST}/channels/${chanId}`, options)
      await commit("setSelectedChan", message.data);
      const message2 = await axios.get(`${HOST}/posts/${postpk}/`, options);
      await commit("setSelectedDiary", message2.data);
      const selectedChanUser = getters.getSelectedChan.user_set;
      for (let idx = 0; idx < selectedChanUser.length; idx++) {
        if (selectedChanUser[idx].id === message.data.user_id) {
          commit("setWriterInfo", selectedChanUser[idx]);
        }
      }  
    } catch (err) {
      err;
        alert("삭제 중에 문제가 발생하였습니다.");
    }
  },

  async deleteDiary({ getters }, postId) {
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
        alert("성공적으로 삭제되었습니다.");
      })
      .catch(err => {
        err;
        alert("삭제 중에 문제가 발생하였습니다.");
      });
    router.push("/postList");
  },
  async leaveChannel({ getters }, ChannelId) {
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
        alert("일기장 탈퇴가 성공적으로 이뤄졌습니다.");
      })
      .catch(err => {
        err;
        alert("일기장 탈퇴 도중 문제가 발생하였습니다.");
      });
    router.push("/");
  },
  //bubble chart
  async generateData ({ commit }, emotionData) {
    let series = []
    const labels = ['Angry', 'Disgust', 'Fear', 'Happy', 'Sad', 'Surprise', 'Neutral']
    for (let k = 0; k < 7; k++) {
      series.push({
        name: labels[k],
        data: new Array()
      })
    }
    for (let i = 0; i < emotionData.length; i++ ) {
      for (let k = 0; k < 7; k++) {
        if (emotionData[i][k] > 0.35) {
          const x = i;
          const y = Math.floor(emotionData[i][k] * 100)
          const z = Math.floor((emotionData[i][k] **2) * 60)
          series[k].data.push([x, y, z])
        }
      }
    }
    await commit("setSeries", series)
  },
  async bringEmotionData({ dispatch }) {
    const emotionData = []
    // const url = getters.getSelectedDiary.csv_url
    const url = "https://mind-gitter-diary.s3.ap-northeast-2.amazonaws.com/emotions/tessdfte2321rasdsdfftest1234sdfsd5sdfsdesdfr.csv"
    if (url) {
      const req = await axios.get(url)
      const csv = req.data
      const rows = csv.split('\n')
      for (let i = 0; i < rows.length; i++ ) {
        if (rows[i]) {
          const colsStr = rows[i].split(',');
          const cols = []
          for (let j =0 ; j < colsStr.length; j++ ) {
            const num = parseFloat(colsStr[j]).toFixed(2)
            cols.push(num)
          }
          emotionData.push(cols)
        }
      }
      await dispatch("generateData", emotionData)
    }
    
  },
  //S3 부분
  s3Init: ({ commit }, type) => {
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
  async updates3({ commit }, PostInfo) {
    const s3 = state.s3;
    const params = {
      Key: PostInfo.fileName,
      Body: PostInfo.file,
      ACL: "public-read-write"
    };
    await s3.upload(params).promise();
    commit("sets3", {});
  },
  async addPost({ dispatch, commit }, PostInfo) {
    if (PostInfo.title && PostInfo.fileName) {
      commit("setPostLoading", true);
      await dispatch("s3Init", "diary");
      await dispatch("updates3", PostInfo);
      const token = sessionStorage.getItem("jwt");
      let tags = PostInfo.tags;
      if (tags == null) {
        tags = "[]";
      } else {
        if (tags.includes("#"))
          tags = tags
            .replace(/(\s*)/g, "")
            .split("#")
            .slice(1);
        else if (tags.includes(","))
          tags = tags.replace(/(\s*)/g, "").split(",");
        else if (tags.includes(" ")) tags = tags.split(" ");

        if (typeof tags == "object") tags = JSON.stringify(tags);
        else tags = '["' + tags + '"]';
      }
      const chanId = sessionStorage.getItem("chan");
      const body = {
        title: PostInfo.title,
        context: PostInfo.context,
        video_file: PostInfo.fileName,
        tags: tags,
        cover_image: PostInfo.cover_image,
        channel_id: parseInt(chanId),
        is_use_comment: PostInfo.possible,
        is_save_video: PostInfo.saveVideo
      };
      const options = {
        headers: {
          Authorization: "JWT " + token
        }
      };
      await axios.post(HOST + "/posts/", body, options);
      commit("setPostLoading", false);
      router.push("/postList");
    } else if (PostInfo.title) {
      alert("! 분석할 영상을 첨부해주세요.");
    } else if (PostInfo.fileName) {
      alert("! 일기의 제목을 작성해주세요.");
    } else {
      alert("! 일기의 제목을 작성해주세요.\n! 분석할 영상을 첨부해주세요..");
    }
  },
  async editPost({ dispatch, commit }, PostInfo) {
    if (PostInfo.file) {
      commit("setPostLoading", true);
      await dispatch("s3Init", "diary");
      await dispatch("updates3", PostInfo);
    }
    const token = sessionStorage.getItem("jwt");
    let tags = PostInfo.tags;
    if (tags == null) {
      tags = "[]";
    } else {
      if (tags.includes("#"))
        tags = tags
          .replace(/(\s*)/g, "")
          .split("#")
          .slice(1);
      else if (tags.includes(",")) tags = tags.replace(/(\s*)/g, "").split(",");
      else if (tags.includes(" ")) tags = tags.split(" ");

      if (typeof tags == "object") tags = JSON.stringify(tags);
      else tags = '["' + tags + '"]';
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
    const options = {
      headers: {
        Authorization: "JWT " + token
      }
    };
    await axios.put(
      `${HOST}/posts/${PostInfo.post_id}/`,
      body,
      options
    );
    commit("setPostLoading", false);
    router.push("/postList");
  },
  addNotification({ getters }, info) {
    getters;
    const token = sessionStorage.getItem("jwt");
    const options = {
      headers: {
        Authorization: "JWT " + token
      }
    };
    const body = {
      username: info.username,
      channel_id: parseInt(info.channel_id),
      notice_type: "join"
    };
    axios.post(HOST + "/notifications/", body, options);
  },
  async bringNotice({ commit }) {
    const token = sessionStorage.getItem("jwt");
    const options = {
      headers: {
        Authorization: "JWT " + token
      }
    };
    await axios.get(HOST + "/notifications/", options).then(message => {
      let notices = [];
      for (const noti of message.data) {
        if (noti.accept_or_not == "0") {
          axios.get(`${HOST}/user/${noti.inviter}`, options).then(mess => {
            const newN = {
              id: noti.id,
              inviter: mess.data.username,
              inviter_img: mess.data.profile_img,
              channelId: noti.channel
            }
            if (!notices.some(n => (n.inviter===newN.inviter) && (n.channelId===newN.channelId))) {
              notices.push(newN);
            }
          });
        }
      }
      commit("setNotiList", notices);
    });
  },
  async joinChan({ getters }, joinInfo) {
    getters;
    const token = sessionStorage.getItem("jwt");
    const options = {
      headers: {
        Authorization: "JWT " + token
      }
    };
    await axios
      .post(`${HOST}/channels/${joinInfo.channelId}/join/`, {}, options)
      .then(message => {
        message;
      })
      .catch(err => {
        err;
      });
    const body = {
      accept_or_not: "1"
    };
    await axios
      .put(`${HOST}/notifications/${joinInfo.id}/`, body, options)
      .then(mess => {
        mess;
      });
  },
  async rejectInvite({ getters }, joinInfo) {
    getters;
    const token = sessionStorage.getItem("jwt");
    const options = {
      headers: {
        Authorization: "JWT " + token
      }
    };
    const body = {
      accept_or_not: "1"
    };
    await axios
      .put(`${HOST}/notifications/${joinInfo.id}/`, body, options)
      .then(mess => {
        mess;
      });
  },
  searchingTag: ({ commit }, searchParams) => {
    const token = sessionStorage.getItem("jwt");
    const options = {
      headers: {
        Authorization: "JWT " + token
      }
    };
    const channId = sessionStorage.getItem("chan");
    axios
      .get(
        `${HOST}/channels/${channId}/tags/?search=${searchParams.searchKwd}`,
        options
      )
      .then(message => {
        const temp = {};
        for (const post of message.data) {
          if (temp[post.created_at.slice(0, 10)]) {
            temp[post.created_at.slice(0, 10)].push({
              pk: post.pk,
              title: post.title,
              tags: post.tags,
              user_id: post.user_id
            });
          } else {
            temp[post.created_at.slice(0, 10)] = [
              {
                pk: post.pk,
                title: post.title,
                tags: post.tags,
                user_id: post.user_id
              }
            ];
          }
        }
        const dates = Object.keys(temp).sort(function(a, b) {
          return b - a;
        });
        temp["dates"] = dates;
        commit("setDiaries", temp);
      });
  }
};

export default {
  state,
  getters,
  mutations,
  actions
};
