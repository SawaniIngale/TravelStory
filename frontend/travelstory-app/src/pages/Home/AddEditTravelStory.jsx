import React, { useState } from 'react'
import { MdAdd, MdClose, MdDeleteOutline, MdUpdate } from 'react-icons/md'
import DateSelector from '../../components/Input/DateSelector';
import ImageSelector from '../../components/Input/ImageSelector';
import TagInput from '../../components/Input/TagInput';
import axiosInstance from '../../utils/axiosInstance';
import moment from 'moment';
import { toast } from 'react-toastify';
import uploadImage from '../../utils/uploadImage';

const AddEditTravelStory =({
    storyInfo,
    type,
    onClose,
    getAllTravelStories,
})=>{

    const [title, setTitle] = useState(storyInfo?.title || "");
    const [storyImg, setStoryImg] = useState(storyInfo?.imageUrl || null);
    const [story, setStory] = useState(storyInfo?.story || "");
    const [visitedLocation, setVisitedLocation] = useState(storyInfo?.visitedLocation ||[]);
    const [visitedDate, setVisitedDate] = useState(storyInfo?.visitedDate || null);
    const [error, setError] = useState("");

    const addNewTravelStory = async() => {
        try{
            let imageUrl = "";
            if(storyImg) {
                const imgUploadRes = await uploadImage(storyImg);
                imageUrl = imgUploadRes.imageUrl || "";
            }
            const response = await axiosInstance.post("/add-travel-story", {
                title,
                story,
                imageUrl: imageUrl || "",
                visitedLocation,
                visitedDate: visitedDate ? moment(visitedDate).valueOf() : moment().valueOf(),
            });

            if(response.data && response.data.story){
                toast.success("Story Added successfully!");
                getAllTravelStories();
                onClose();
            }

        }catch(error){
            console.log("Unexpected error",error);
        }
    };

    const updateTravelStory = async() => {
        const storyId = storyInfo._id;
        try{
            let imageUrl = "";

            let postData = {
                title,
                story,
                imageUrl: storyInfo.imageUrl || "",
                visitedLocation,
                visitedDate: visitedDate ? moment(visitedDate).valueOf() : moment().valueOf(),
            }

            if(typeof storyImg === "object"){
                const imgUploadRes = await uploadImage(storyImg);
                imageUrl = imgUploadRes.imageUrl || "";

                postData = {
                    ...postData,
                    imageUrl: imageUrl,
                };
            }

            const response = await axiosInstance.post("/edit-story/" + storyId, postData);

            if(response.data && response.data.story){
                toast.success("Story Updated successfully!");
                getAllTravelStories();
                onClose();
            }

        }catch(error){
            console.log("Unexpected error",error);
        }
    };

    const handleAddOrUpdateClick = () => {
        console.log("Input data: ", {title, storyImg, story, visitedLocation, visitedDate})

        if(!title){
            setError("Please enter Title");
            return;
        }
        if(!story){
            setError("Please enter Story description");
            return;
        }

        setError("");
        if(type === "edit"){
            updateTravelStory();
        } else {
            addNewTravelStory();
        }
    };

    const handleDeleteImg = async() => {
        const deleteImgRes = await axiosInstance.delete("/delete-image",{
            params: {
                imageUrl : storyInfo.imageUrl,
            },
        });

        if(deleteImgRes.data){
            const storyId = storyInfo._id;

            const postData ={
                title,
                story,
                visitedDate : moment().valueOf(),
                visitedLocation,
                imageUrl: "",
            };

            const response = await axiosInstance.post("/edit-story/"+ storyId, postData);
            setStoryImg(null);
        }
    };
    return(
        <div className='relative'>
            <div className='flex items-center justify-between'>
                <h5 className='text=xl font-medium text-slate-700'>
                    {type === "add" ? "Add Story":"update Story"}
                </h5>
                <div>
                    <div className='flex items-center gap-3 bg-cyan-50/50 p-2 rounded-l-lg'>
                        {type === "add" ? (<button className='btn-small' onClick={handleAddOrUpdateClick}>
                            <MdAdd className='text-lg'/>Add Story
                        </button>
                        ):(
                            <>
                                <button className='btn-small' onClick={handleAddOrUpdateClick}>
                                    <MdUpdate className='text-lg'/>Update Story
                                </button>

                                <button className='btn-small btn-delete' onClick={onClose}>
                                    <MdDeleteOutline className='text-lg'/>Delete
                                </button>
                            </>

                        )}

                        <button className='btn-small' onClick={onClose}>
                            <MdClose className='text-lg'/> 
                        </button>
                    </div>
                    {error && (
                        <p className='text-red-500 text-xs pt-2 text-right'>{error}</p>
                    )}
                </div>
            </div>

            <div>
                <div className='flex-1 flex flex-col gap-2 pt-4'>
                    <label className='input-label'>Title</label>
                    <input
                        type="text"
                        className='text-2xl text-slate-950 outline-none'
                        placeholder='A day in San Francisco...'
                        value={title}
                        onChange={({target}) => setTitle(target.value)}
                    />

                    <div className='my-3'>
                        <DateSelector date= {visitedDate} setDate={setVisitedDate}/>
                    </div>

                    <ImageSelector image={storyImg} setImage={setStoryImg} handleDeleteImg={{handleDeleteImg}}/>

                    <div className='flex flex-col gap-2 mt-4'>
                        <label className='input-label'>Story</label>
                        <textarea
                            type = "text"
                            className='text-sm text-slate-950 outline-none bg-slate-50 p-2 rounded'
                            placeholder='Your Story'
                            rows={10}
                            value={story}
                            onChange={({target}) => setStory(target.value)}
                        />

                    </div>
                    <div className='pt-3'>
                        <label className='input-label'>Visited Location</label>
                        <TagInput tags={visitedLocation} setTags={setVisitedLocation}/>

                    </div>
                </div>
            </div>
        </div>
    )
}

export default AddEditTravelStory