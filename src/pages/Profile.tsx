import { useEffect, useState } from 'react';
import { FiCamera } from 'react-icons/fi';
import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';
import CoverOne from '../images/cover/cover-01.png';
import userSix from '../images/user/user-06.png';
import { Link } from 'react-router-dom';

const Profile = () => {
  // ✅ preview states (default images)
  const [coverPreview, setCoverPreview] = useState(CoverOne);
  const [profilePreview, setProfilePreview] = useState(userSix);

  // ✅ cleanup object URLs to avoid memory leak
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

  const validateImage = (file, maxMB = 3) => {
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

  // ✅ Cover change (preview now, upload later)
  const handleCoverChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const v = validateImage(file, 4);
    if (!v.ok) {
      alert(v.msg);
      e.target.value = '';
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setCoverPreview(localUrl);

    // ✅ OPTIONAL: upload to server
    // const formData = new FormData();
    // formData.append('image', file);
    // const res = await fetch('/api/profile/cover', { method: 'POST', body: formData });
    // const data = await res.json();
    // if (data?.url) setCoverPreview(data.url);
  };

  // ✅ Profile change (preview now, upload later)
  const handleProfileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const v = validateImage(file, 2);
    if (!v.ok) {
      alert(v.msg);
      e.target.value = '';
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setProfilePreview(localUrl);

    // ✅ OPTIONAL: upload to server
    // const formData = new FormData();
    // formData.append('image', file);
    // const res = await fetch('/api/profile/photo', { method: 'POST', body: formData });
    // const data = await res.json();
    // if (data?.url) setProfilePreview(data.url);
  };

  return (
    <>
      <Breadcrumb pageName="Profile" />

      <div className="overflow-hidden rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="relative z-20 h-35 md:h-65">
          <img
            src={coverPreview}
            alt="profile cover"
            className="h-full w-full rounded-tl-sm rounded-tr-sm object-cover object-center"
          />
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
              />
              <span>
                <svg
                  className="fill-current"
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M4.76464 1.42638C4.87283 1.2641 5.05496 1.16663 5.25 1.16663H8.75C8.94504 1.16663 9.12717 1.2641 9.23536 1.42638L10.2289 2.91663H12.25C12.7141 2.91663 13.1592 3.101 13.4874 3.42919C13.8156 3.75738 14 4.2025 14 4.66663V11.0833C14 11.5474 13.8156 11.9925 13.4874 12.3207C13.1592 12.6489 12.7141 12.8333 12.25 12.8333H1.75C1.28587 12.8333 0.840752 12.6489 0.512563 12.3207C0.184375 11.9925 0 11.5474 0 11.0833V4.66663C0 4.2025 0.184374 3.75738 0.512563 3.42919C0.840752 3.101 1.28587 2.91663 1.75 2.91663H3.77114L4.76464 1.42638ZM5.56219 2.33329L4.5687 3.82353C4.46051 3.98582 4.27837 4.08329 4.08333 4.08329H1.75C1.59529 4.08329 1.44692 4.14475 1.33752 4.25415C1.22812 4.36354 1.16667 4.51192 1.16667 4.66663V11.0833C1.16667 11.238 1.22812 11.3864 1.33752 11.4958C1.44692 11.6052 1.59529 11.6666 1.75 11.6666H12.25C12.4047 11.6666 12.5531 11.6052 12.6625 11.4958C12.7719 11.3864 12.8333 11.238 12.8333 11.0833V4.66663C12.8333 4.51192 12.7719 4.36354 12.6625 4.25415C12.5531 4.14475 12.4047 4.08329 12.25 4.08329H9.91667C9.72163 4.08329 9.53949 3.98582 9.4313 3.82353L8.43781 2.33329H5.56219Z"
                    fill="white"
                  />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M6.99992 5.83329C6.03342 5.83329 5.24992 6.61679 5.24992 7.58329C5.24992 8.54979 6.03342 9.33329 6.99992 9.33329C7.96642 9.33329 8.74992 8.54979 8.74992 7.58329C8.74992 6.61679 7.96642 5.83329 6.99992 5.83329ZM4.08325 7.58329C4.08325 5.97246 5.38909 4.66663 6.99992 4.66663C8.61075 4.66663 9.91659 5.97246 9.91659 7.58329C9.91659 9.19412 8.61075 10.5 6.99992 10.5C5.38909 10.5 4.08325 9.19412 4.08325 7.58329Z"
                    fill="white"
                  />
                </svg>
              </span>
              <span>Edit</span>
            </label>
          </div>
        </div>

        <div className="px-4 pb-6 text-center lg:pb-8 xl:pb-11.5">
          <div className="relative z-30 mx-auto -mt-22 h-30 w-30 rounded-full bg-white/20 p-1 backdrop-blur sm:h-44 sm:w-44 sm:p-3">
            {/* ✅ circle clip area */}
            <div className="relative h-full w-full overflow-hidden rounded-full">
              <img
                src={profilePreview}
                alt="profile"
                className="h-full w-full rounded-full object-cover"
              />
            </div>

            {/* ✅ camera outside clip */}
            <label
              htmlFor="profile"
               className="absolute z-50 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-opacity-90
             bottom-[4px] right-[45px] sm:h-10 sm:w-10"
            >
              <FiCamera />
              <input
                type="file"
                name="profile"
                id="profile"
                className="sr-only"
                accept="image/*"
                onChange={handleProfileChange}
              />
            </label>
          </div>



          <div className="mt-4">
            <h3 className="mb-1.5 text-2xl font-semibold text-black dark:text-white">
              Danish Heilium
            </h3>
            <p className="font-medium">Ui/Ux Designer</p>

            <div className="mx-auto mt-4.5 mb-5.5 grid max-w-94 grid-cols-3 rounded-md border border-stroke py-2.5 shadow-1 dark:border-strokedark dark:bg-[#37404F]">
              <div className="flex flex-col items-center justify-center gap-1 border-r border-stroke px-4 dark:border-strokedark xsm:flex-row">
                <span className="font-semibold text-black dark:text-white">
                  259
                </span>
                <span className="text-sm">Posts</span>
              </div>
              <div className="flex flex-col items-center justify-center gap-1 border-r border-stroke px-4 dark:border-strokedark xsm:flex-row">
                <span className="font-semibold text-black dark:text-white">
                  129K
                </span>
                <span className="text-sm">Followers</span>
              </div>
              <div className="flex flex-col items-center justify-center gap-1 px-4 xsm:flex-row">
                <span className="font-semibold text-black dark:text-white">
                  2K
                </span>
                <span className="text-sm">Following</span>
              </div>
            </div>

            <div className="mx-auto max-w-180">
              <h4 className="font-semibold text-black dark:text-white">
                About Me
              </h4>
              <p className="mt-4.5">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                Pellentesque posuere fermentum urna, eu condimentum mauris
                tempus ut. Donec fermentum blandit aliquet. Etiam dictum dapibus
                ultricies. Sed vel aliquet libero. Nunc a augue fermentum,
                pharetra ligula sed, aliquam lacus.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;
