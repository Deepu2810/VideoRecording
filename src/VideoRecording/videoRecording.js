import React, {Component} from 'react';
import {View, Text, TouchableHighlight, Platform} from 'react-native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker/src';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import {Video} from 'react-native-compressor';
import {ProcessingManager} from 'react-native-video-processing';
import axios from 'axios';
import RNFetchBlob from 'rn-fetch-blob';
import ChunkUpload from 'react-native-chunk-upload';
const lowOptions = {
  videoQuality: 'low',
  mediaType: 'video',
  durationLimit: 120,
  cameraType: 'front',
  saveToPhotos: true,
};
const mediumOptions = {
  videoQuality: 'medium',
  mediaType: 'video',
  durationLimit: 120,
  cameraType: 'front',
  saveToPhotos: true,
};
const highOptions = {
  videoQuality: 'high',
  mediaType: 'video',
  durationLimit: 120,
  cameraType: 'front',
  saveToPhotos: true,
};

class videoRecording extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  lowRecordVideo() {
    launchCamera(lowOptions, response => {
      console.warn('response+++', response);
    }).catch(err => {
      console.warn('err--->', err);
    });
  }

  mediumRecordVideo() {
    launchCamera(mediumOptions, response => {
      console.warn('response+++', response);
    }).catch(err => {
      console.warn('err--->', err);
    });
  }

  highRecordVideo() {
    launchCamera(highOptions, response => {
      console.warn('response+++', response);
      // this.compressVideo(response);
      // this.compressProceesingVideo(response);
      // this.callAPI(response);
      const chunk = new ChunkUpload({
        path: response.assets[0].uri, // Path to the file
        size: 100950 * 3, // Chunk size (must be multiples of 3)
        filename: 'file.mp4',
        fileSize: response.assets[0].fileSize, // Original file size
      });
      chunk.digIn(this.upload.bind(this));
    }).catch(err => {
      console.warn('err--->', err);
    });
  }
  compressVideo = async response => {
    console.warn(response.assets[0].uri);
    let result = await Video.compress(
      response.assets[0].uri,
      {
        compressionMethod: 'auto',
      },
      progress => {
        console.warn('Compression Progress: ', progress);
      },
    );
    console.warn('result--', result);
    let a = result.replace('file://', 'file:///');
    console.warn('a--', a);
  };
  compressProceesingVideo(response) {
    ProcessingManager.compress(response.assets[0].uri, {
      width: 720,
      height: 1280,
      bitrateMultiplier: 3,
      saveToCameraRoll: true, // default is false, iOS only
      saveWithCurrentDate: true, // default is false, iOS only
      minimumBitrate: 300000,
      removeAudio: true, // default is false
    }) // reverses the source video
      .then(data => {
        console.warn('data--', data);
      });
  }

  callAPI(response) {
    RNFetchBlob.fetch(
      'POST',
      'https://api-staging.sociopay.ae/api/v4/uploadFile',
      {
        'content-type': 'multipart/form-data',
        Accept: 'multipart/form-data',
      },
      [
        {
          name: 'file',
          filename: 'file.mp4',
          data: RNFetchBlob.wrap(response.assets[0].uri),
        },
      ],
    )
      // .then(response => response.json())
      .then(response => {
        console.warn('response---', response);
        if (response.success) {
          // If you will get a success response from your api
          console.warn('Video is uploaded successfully');
        } else {
          console.warn('Something went wrong');
        }
      })
      .catch(err => {
        console.warn('Err', err);
        // alert(err);
      });
  }

  upload(file, next, retry, unlink) {
    console.warn('file', file);
    console.warn('next', next);
    console.warn('retry', retry);
    console.warn('unlink', unlink);
    const body = new FormData();

    body.append('video', file.blob); // param name
    body.append('chunk_number', file.headers['x-chunk-number']);
    body.append('chunk_total_number', file.headers['x-chunk-total-number']);
    body.append('chunk_size', file.headers['x-chunk-size']);
    body.append('file_name', file.headers['x-file-name']);
    body.append('file_size', file.headers['x-file-size']);
    body.append('file_identity', file.headers['x-file-identity']);

    console.warn('body----+++', body);
    axios
      .post('https://api-staging.sociopay.ae/api/v4/uploadFile', body, {
        headers: {
          Accept: 'application/json',
          // 'x-chunk-number': file.headers['x-chunk-number'],
          // 'x-chunk-total-number': file.headers['x-chunk-total-number'],
          // 'x-chunk-size': file.headers['x-chunk-size'],
          // 'x-file-name': file.headers['x-file-name'],
          // 'x-file-size': file.headers['x-file-size'],
          // 'x-file-identity': file.headers['x-file-identity'],
        },
      })
      .then(response => {
        console.warn('response', response.status);
        switch (response.status) {
          // done
          case 200:
            console.warn('response.data---', response.data);
            if (
              file.headers['x-chunk-number'] <=
              file.headers['x-chunk-total-number']
            ) {
              console.warn('Chunk Number----', file.headers['x-chunk-number']);
              next();
              break;
            }

          // 🕗 still uploading...
          case 201:
            console.warn(`${response.data.progress}% uploaded...`);

            if (
              file.headers['x-chunk-number'] <=
              file.headers['x-chunk-total-number']
            ) {
              console.warn('Chunk Number----', file.headers['x-chunk-number']);
              next();
              break;
            }
        }
      })
      .catch(error => {
        console.warn('error-----', error.response);
        if (error.response) {
          if ([400, 404, 415, 500, 501].includes(error.response.status)) {
            console.warn(error.response.status, 'Failed to upload the chunk.');

            unlink(file.path);
          } else if (error.response.status === 422) {
            console.warn('Validation Error', error.response.data);

            unlink(file.path);
          } else {
            console.warn('Re-uploading the chunk...');

            retry();
          }
        } else {
          console.warn('Re-uploading the chunk...');

          retry();
        }
      });
  }

  render() {
    return (
      <View style={{width: wp(100), alignItems: 'center'}}>
        <TouchableHighlight
          style={{
            height: hp(8),
            width: wp(40),
            backgroundColor: '#fec92d',
            marginTop: hp(9),
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 8,
          }}>
          <Text onPress={() => this.lowRecordVideo()}>Low Quality</Text>
        </TouchableHighlight>

        {Platform.OS == 'ios' ? (
          <TouchableHighlight
            style={{
              height: hp(8),
              width: wp(40),
              backgroundColor: '#fec92d',
              marginTop: hp(4),
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: 8,
            }}>
            <Text onPress={() => this.mediumRecordVideo()}>Medium Quality</Text>
          </TouchableHighlight>
        ) : null}
        <TouchableHighlight
          style={{
            height: hp(8),
            width: wp(40),
            backgroundColor: '#fec92d',
            marginTop: hp(4),
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 8,
          }}>
          <Text onPress={() => this.highRecordVideo()}>High Quality</Text>
        </TouchableHighlight>
      </View>
    );
  }
}

export default videoRecording;
// 2 minutes Video Recording

// For Android
// Low Quality: 3 MB
// High Quality: 73 MB

// IOS
// Low: 2.3 MB
// Medium: 12.11 MB
// High: 159 MB
