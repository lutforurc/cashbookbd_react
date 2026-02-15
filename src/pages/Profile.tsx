import { useEffect, useState } from 'react';
import { FiCamera } from 'react-icons/fi';
import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';
import CoverOne from '../images/cover/cover-01.png';
import userSix from '../images/user/user-06.png';
import { useDispatch, useSelector } from 'react-redux';
import { uploadUserCover, uploadUserPhoto } from '../components/modules/user/userSlice';

// ✅ IMPORTANT: path ঠিক করুন (এইটাই আপনার main issue)
// উদাহরণ:
// import { uploadUserPhoto, uploadUserCover } from '../redux/reducers/userReducer';
// import { uploadUserPhoto, uploadUserCover } from '../store/user/userReducer';
// import { uploadUserPhoto, uploadUserCover } from '../redux/reducers/userReducer';

const Profile = () => {
  const dispatch: any = useDispatch();

  // ✅ auth me
  const { me } = useSelector((state: any) => state.auth || {});

  // ✅ user reducer state (safe)
  const userState = useSelector((state: any) => state.user || state.users || {});
  const {
    uploadLoading = false,
    photoUrl = null,
    coverUrl = null,
    errors = null,
  } = userState;

  // ✅ preview states (default images)
  const [coverPreview, setCoverPreview] = useState<string>(CoverOne);
  const [profilePreview, setProfilePreview] = useState<string>(userSix);

  // ✅ sync preview from reducer upload result
  useEffect(() => {
    if (coverUrl) setCoverPreview(coverUrl);
  }, [coverUrl]);

  useEffect(() => {
    if (photoUrl) setProfilePreview(photoUrl);
  }, [photoUrl]);

  // ✅ sync preview from me (if backend returns these)
  useEffect(() => {
    if (me?.profile_photo) setCoverPreview(me.profile_photo);
    if (me?.photo_url) setProfilePreview(me.photo_url);
  }, [me]);

  // ✅ cleanup blob URLs (prevent memory leak)
  useEffect(() => {
    return () => {
      if (typeof coverPreview === 'string' && coverPreview.startsWith('blob:')) {
        URL.revokeObjectURL(coverPreview);
      }
      if (
        typeof profilePreview === 'string' &&
        profilePreview.startsWith('blob:')
      ) {
        URL.revokeObjectURL(profilePreview);
      }
    };
  }, [coverPreview, profilePreview]);

  const validateImage = (file: File, maxMB = 3) => {
    if (!file) return { ok: false, msg: 'No file selected' };
    if (!file.type?.startsWith('image/')) {
      return { ok: false, msg: 'Please select an image file' };
    }
    const maxBytes = maxMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return { ok: false, msg: `Max ${maxMB}MB allowed` };
    }
    return { ok: true, msg: '' };
  };

  // ✅ Cover upload
  const handleCoverChange = (e: any) => {
    const file: File | undefined = e.target.files?.[0];
    if (!file) return;

    const v = validateImage(file, 4);
    if (!v.ok) {
      alert(v.msg);
      e.target.value = '';
      return;
    }

    // ✅ instant preview
    const localUrl = URL.createObjectURL(file);
    setCoverPreview(localUrl);

    // ✅ upload via redux action
    dispatch(
      uploadUserCover(file, (res: any) => {
        if (res?.success) {
          const url = res?.url || res?.data?.url || res?.data?.profile_photo;
          if (url) setCoverPreview(url);
        } else {
          alert(res?.error?.message || res?.message || 'Cover upload failed');
        }
      })
    );
  };

  console.log('====================================');
  console.log("Cover upload triggered, file:", me);
  console.log('====================================');

  // ✅ Profile photo upload
  const handleProfileChange = (e: any) => {
    const file: File | undefined = e.target.files?.[0];
    if (!file) return;

    const v = validateImage(file, 2);
    if (!v.ok) {
      alert(v.msg);
      e.target.value = '';
      return;
    }

    // ✅ instant preview
    const localUrl = URL.createObjectURL(file);
    setProfilePreview(localUrl);

    // ✅ upload via redux action
    dispatch(
      uploadUserPhoto(file, (res: any) => {
        if (res?.success) {
          const url = res?.url || res?.data?.url || res?.data?.photo_url;
          if (url) setProfilePreview(url);
        } else {
          alert(res?.error?.message || res?.message || 'Photo upload failed');
        }
      })
    );
  };

  return (
    <>
      <Breadcrumb pageName="Profile" />

      <div className="overflow-hidden rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="relative z-20 h-35 md:h-65">
          {/* <img
            src={me.profile_photo || coverPreview}
            alt="profile cover"
            className="h-full w-full rounded-tl-sm rounded-tr-sm object-cover object-center"
          /> */}

          <div className="absolute bottom-1 right-1 z-10 xsm:bottom-4 xsm:right-4">
            <label
              htmlFor="cover"
              className="flex cursor-pointer items-center justify-center gap-2 rounded bg-primary py-1 px-2 text-sm font-medium text-white hover:bg-opacity-90 xsm:px-4"
            >
              <input
                type="file"
                name="cover"
                id="cover"
                className="sr-only"
                accept="image/*"
                onChange={handleCoverChange}
                disabled={uploadLoading}
              />
              <span>{uploadLoading ? 'Uploading...' : 'Edit'}</span>
            </label>
          </div>
        </div>

        <div className="px-4 pb-6 text-center lg:pb-8 xl:pb-11.5">
          <div className="relative z-30 mx-auto -mt-22 h-30 w-30 rounded-full bg-white/20 p-1 backdrop-blur sm:h-44 sm:w-44 sm:p-3">
            <div className="relative h-full w-full overflow-hidden rounded-full">
              <img
                src={me.profile_photo || profilePreview}
                alt="profile"
                className="h-full w-full rounded-full object-cover"
              />
            </div>

            <label
              htmlFor="profile"
              className="absolute z-50 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-opacity-90 bottom-[4px] right-[45px] sm:h-10 sm:w-10"
              title="Change photo"
            >
              <FiCamera />
              <input
                type="file"
                name="profile"
                id="profile"
                className="sr-only"
                accept="image/*"
                onChange={handleProfileChange}
                disabled={uploadLoading}
              />
            </label>
          </div>

          <div className="mt-4">
            <h3 className="mb-1.5 text-2xl font-semibold text-black dark:text-white">
              {me?.name || 'User Name'}
            </h3>

            {errors ? (
              <p className="mt-3 text-sm text-red-600">{String(errors)}</p>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;
